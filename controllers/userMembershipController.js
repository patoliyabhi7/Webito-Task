const User = require('./../model/userModel')
const Membership = require('./../model/membershipModel')
const UserMembership = require('./../model/userMembershipModel')
const Transaction = require('./../model/transactionModel')
const appError = require('./../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const sendEmail = require('./../utils/email');
const mongoose = require('mongoose');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

exports.purchaseMembership = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new appError('User not found or not logged in!!', 404))
    }
    const membership = await Membership.findById(req.params.m_id);
    if (!membership) {
        return next(new appError('Membership Plan not found!', 404));
    }
    maturity_date = new Date();
    maturity_date.setDate(maturity_date.getDate() + membership.validity);

    investment_amount = membership.price;
    roi_amount = (investment_amount * membership.roi / 100);

    const userMembership = await UserMembership.create({
        userId: user.id,
        membershipId: req.params.m_id,
        maturityDate: maturity_date,
        investedAmount: investment_amount,
        roiAmount: roi_amount
    })
    if (!userMembership) {
        return next(new appError('Error while purchasing membership!', 500))
    }

    user.membership_plan.push(membership.id);
    user.membership_history.push(userMembership.id);
    await user.save({ validateBeforeSave: false });

    const transaction = await Transaction.create({
        userId: user.id,
        userMembershipId: userMembership.id,
        transactionType: 'credit',
        amount: investment_amount,
        note: `Investment done for ${membership.planName} plan`
    })

    if (!transaction) {
        return next(new appError('Error while creating transaction!', 500))
    }

    userMembership.transactionId = transaction.id;
    await userMembership.save({ validateBeforeSave: false });

    // Send email to user
    const message = `Congratulations! You have successfully purchased the plan. \n
    Plan Name: ${membership.planName} \n
    Invested Amount: ${membership.price} \n
    ROI Amount: ${userMembership.roiAmount} \n
    Purchased On: ${userMembership.purchasedOn} \n
    Maturity Date: ${userMembership.maturityDate}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Plan Purchase Successful!',
            message
        });
        res.status(201).json({
            status: 'success',
            message: 'Plan purchase successful. Check your email for further details!',
            data: {
                userMembership
            }
        });
    } catch (err) {
        return next(new appError('Error while sending purchased membership email!', 500));
    }
});

// Show user plan details using lookup
exports.getMyMemberships = catchAsync(async (req, res, next) => {
    const userId = req.user.id;

    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'usermemberships',
                localField: '_id',
                foreignField: 'userId',
                as: 'membership_history'
            }
        },
        {
            $unwind: {
                path: '$membership_history',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'memberships',
                localField: 'membership_history.membershipId',
                foreignField: '_id',
                as: 'membership_history.membershipId'
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                email: { $first: '$email' },
                username: { $first: '$username' },
                membership_history: { $push: '$membership_history' }
            }
        }
    ]);

    if (!user || user.length === 0) {
        return next(new appError('Membership not found.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: user[0]
        }
    });
});

exports.getMembershipDetailsByUId = catchAsync(async (req, res, next) => {
    // membership details by user_id
    const userId = req.params.id;

    const user = await User.aggregate([
        {
            $match: { _id: new mongoose.Types.ObjectId(userId) }
        },
        {
            $lookup: {
                from: 'usermemberships',
                localField: '_id',
                foreignField: 'userId',
                as: 'membership_history'
            }
        },
        {
            $unwind: {
                path: '$membership_history',
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: 'memberships',
                localField: 'membership_history.membershipId',
                foreignField: '_id',
                as: 'membership_history.membershipId'
            }
        },
        {
            $group: {
                _id: '$_id',
                name: { $first: '$name' },
                email: { $first: '$email' },
                username: { $first: '$username' },
                membership_history: { $push: '$membership_history' }
            }
        }
    ]);

    if (!user || user.length === 0) {
        return next(new appError('Membership not found.', 404));
    }

    res.status(200).json({
        status: 'success',
        data: {
            user: user[0]
        }
    });
})

const membershipSalesReport = async (startDate, endDate) => {
    try {

        startDate = new Date(startDate);
        endDate = new Date(endDate);
        endDate.setUTCHours(23, 59, 59, 999);

        return salesReport = await UserMembership.aggregate([
            {
                $match: {
                    purchasedOn: {
                        $gte: startDate,
                        $lte: endDate
                    }
                }
            },
            {
                $lookup: {
                    from: 'memberships',
                    localField: 'membershipId',
                    foreignField: '_id',
                    as: 'membership_details'
                }
            },
            {
                $unwind: '$membership_details'
            },
            {
                $group: {
                    _id: {
                        year: { $year: '$purchasedOn' },
                        month: { $month: '$purchasedOn' },
                        day: { $dayOfMonth: '$purchasedOn' }
                    },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$membership_details.price' }
                }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: {
                                $dateFromParts: {
                                    year: "$_id.year",
                                    month: "$_id.month",
                                    day: "$_id.day"
                                }
                            }
                        }
                    },
                    membership_quantity: "$count",
                    sales_in_amount: "$totalAmount"
                }
            },
            {
                $sort: { date: 1 }
            }
        ]);
    } catch (error) {
        return next(new appError('Error while fetching sales report using function', 500));
    }
};

exports.getMembershipSalesReport = catchAsync(async (req, res, next) => {
    try {
        let { startDate, endDate } = req.body;

        if (!startDate && !endDate) {
            return next(new appError('Please provide start and end date!', 400));
        }
        if (!endDate) {
            endDate = startDate;
        }

        let salesReport = await membershipSalesReport(startDate, endDate);
    } catch (error) {
        return next(new appError('Error while fetching sales report!', 500));
    }

    res.status(200).json({
        status: 'success',
        data: salesReport
    });
});

// cron job to email send daily sales report
cron.schedule('59 59 23 * * *', async () => {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setUTCHours(0, 0, 0, 0);
        const salesReport = await membershipSalesReport(startDate, endDate);

        for (const report of salesReport) {
            const message = `Sales report for the day: ${report.date} \n
Membership Quantity: ${report.membership_quantity} \n
Sales in Amount: ${report.sales_in_amount}`;
            try {
                await sendEmail({
                    email: 'sales@gmail.com',
                    subject: `Sales Report for the day: ${new Date().toDateString()}`,
                    message
                });
            } catch (err) {
                return next(new appError('Error while sending purchased membership email!', 500));
            }
        }
    } catch (error) {
        return next(new appError('Error while fetching sales report', 500));
    }
});

// Cron-job to perform the transaction of actual amount & ROI to user account on maturity date
// cron.schedule('* * * * * *', async () => {
cron.schedule('59 59 23 * * *', async () => {
    try {
        const currentDate = new Date();
        const userMemberships = await UserMembership.find({ maturityDate: { "$lte": currentDate }, status: 'Active' });
        if (!userMemberships || userMemberships.length === 0) {
            return next(new appError(`No user have any maturity on ${currentDate}`, 404));
        }
        for (const userMembership of userMemberships) {
            const investedTransaction = await Transaction.create({
                userId: userMembership.userId,
                userMembershipId: userMembership.id,
                transactionType: 'debit',
                amount: userMembership.investedAmount,
                note: `Investment amount credited to the user account. Amount ${userMembership.investedAmount}`
            })
            const roiTransaction = await Transaction.create({
                userId: userMembership.userId,
                userMembershipId: userMembership.id,
                transactionType: 'debit',
                amount: userMembership.roiAmount,
                note: `ROI amount credited to the user account. Amount ${userMembership.roiAmount}`
            })
            if (!investedTransaction || !roiTransaction) {
                return next(new appError('Error while transaction for maturity amount', 500));
            }
            userMembership.status = 'Matured';
            await userMembership.save({ validateBeforeSave: false });

            // Send email to user
            const userRow = await User.findById(userMembership.userId);
            const membership = await Membership.findById(userMembership.membershipId);
            const message = `Congratulations! Your plan is Matured and Invested amount and return is credited to you account \n
            Plan Name: ${membership.planName} \n
            Invested Amount: ${membership.price} \n
            ROI Amount: ${userMembership.roiAmount} \n
            Purchased On: ${userMembership.purchasedOn} \n
            Maturity Date: ${userMembership.maturityDate}`;
            try {
                await sendEmail({
                    email: userRow.email,
                    subject: 'Your Plan is Matured and Amount Credited',
                    message
                });
            } catch (err) {
                console.log(err)
            }
        }
    } catch (error) {
        return next(new appError('Error while scheduling transaction for maturity amount', 500));
    }
})

// blob
exports.export_transactions = catchAsync(async (req, res, next) => {
    const userIds = req.body.ids;
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return next(new appError('Please provide an array of user ids!', 400));
    }

    try {
        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transaction History');

        // Set default column widths
        worksheet.columns = [
            { key: 'particulars', width: 15 },
            { key: 'date', width: 25 },
            { key: 'credit', width: 10 },
            { key: 'debit', width: 10 },
            { key: 'cycle', width: 15 },
            { key: 'roi', width: 10 },
            { key: 'note', width: 50 }
        ];

        for (const userId of userIds) {
            const user = await User.findById(userId);
            if (!user) {
                worksheet.addRow([`User ID ${userId} not found!`]);
                worksheet.addRow([]);
                continue;
            }

            const transactions = await Transaction.find({ userId }).sort({ transactionDate: 1 })
            if (!transactions.length) {
                worksheet.addRow([`No transactions found for User ID ${userId}`]);
                worksheet.addRow([]);
                continue;
            }

            // Add a newline before the new user's data
            worksheet.addRow([]);

            // Add user section header
            const startRowNumber = worksheet.rowCount;
            worksheet.mergeCells(`A${startRowNumber}:G${startRowNumber}`);
            const headerCell = worksheet.getCell(`A${startRowNumber}`);
            headerCell.value = `${user.name}'s Transaction History`;
            headerCell.style = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'middle' }
            };

            // Define and style the header row
            const headerRow = worksheet.addRow(['Particulars', 'Date', 'Credit', 'Debit', 'Cycle(in days)', 'ROI(%)', 'Note']);
            headerRow.eachCell({ includeEmpty: true }, (cell) => {
                cell.style.font = { bold: true };
            });

            // Initialize balance
            let balance = 0;

            // Add transaction rows
            for (const transaction of transactions) {
                let particulars, credit, debit, roi, days;

                const userMembership = await UserMembership.findById(transaction.userMembershipId);
                if (!userMembership) {
                    worksheet.addRow([`User Membership not found for transaction ID ${transaction._id}`]);
                    continue;
                }
                const membership = await Membership.findById(userMembership.membershipId);
                if (!membership) {
                    worksheet.addRow([`Membership Plan not found for transaction ID ${transaction._id}`]);
                    continue;
                }

                roi = membership.roi;
                days = membership.validity;

                if (transaction.transactionType === 'credit') {
                    particulars = 'Investment';
                    credit = transaction.amount;
                    debit = '';
                    balance += transaction.amount; // Increase balance by credit amount
                } else {
                    particulars = 'Plan Matured';
                    credit = '';
                    debit = transaction.amount;
                    balance -= transaction.amount; // Decrease balance by debit amount

                    // Calculate ROI
                    const roiAmount = (transaction.amount * roi) / 100;
                    balance += roiAmount; // Add ROI to the balance

                    if (transaction.note.includes('ROI amount credited')) {
                        balance -= roiAmount; // Subtract ROI amount when ROI is debited
                    }
                }

                const formattedDate = new Date(transaction.transactionDate).toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                worksheet.addRow([particulars, formattedDate, credit, debit, days, `${roi}%`, transaction.note]);
            }

            // Add final balance row for the user
            const finalBalanceRow = worksheet.addRow([]);
            finalBalanceRow.getCell(2).value = `Final Balance for ${user.name}`;
            finalBalanceRow.getCell(2).style = { font: { bold: true } };

            // Merge and center C and D columns
            worksheet.mergeCells(`C${finalBalanceRow.number}:D${finalBalanceRow.number}`);
            const balanceCell = worksheet.getCell(`C${finalBalanceRow.number}`);
            balanceCell.value = balance;
            balanceCell.style = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'middle' } };

            // Add an empty row for separation
            worksheet.addRow([]);
        }

        // Generate buffer from workbook
        const buffer = await workbook.xlsx.writeBuffer();

        // Ensure the directory exists
        const dir = path.join('C:/Users/patol/OneDrive/Desktop/exports');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write the buffer to a file
        const fileName = path.join(dir, `transactions.xlsx`);
        fs.writeFile(fileName, buffer, (err) => {
            if (err) {
                console.error('File write error:', err);
                return res.status(500).send('Error in creating file');
            }

            // Send the file to the client
            res.download(fileName, `transactions.xlsx`, (err) => {
                if (err) {
                    console.error('File download error:', err);
                    return res.status(500).send('Error in downloading file');
                } else {
                    // uncomment the following lines to delete the file after download
                    // fs.unlink(fileName, (err) => {
                    //     if (err) {
                    //         console.error('File deletion error:', err);
                    //     }
                    // });
                }
            });
        });
    } catch (err) {
        console.error('Error fetching transactions:', err);
        res.status(500).send('Internal Server Error');
    }
});
