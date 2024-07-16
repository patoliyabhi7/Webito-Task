const User = require('./../model/userModel')
const Membership = require('./../model/membershipModel')
const UserMembership = require('./../model/userMembershipModel')
const appError = require('./../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const sendEmail = require('./../utils/email');
const mongoose = require('mongoose');
const cron = require('node-cron');

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