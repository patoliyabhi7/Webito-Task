const User = require('./../model/userModel')
const Membership = require('./../model/membershipModel')
const UserMembership = require('./../model/userMembershipModel')
const appError = require('./../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const sendEmail = require('./../utils/email');

exports.purchaseMembership = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id).populate('membership_history').populate('membership_plan');
    if (!user) {
        return next(new appError('User not found or not logged in!!', 404))
    }
    const membership = await Membership.findById(req.params.m_id);
    if (!membership) {
        return next(new appError('Membership not found!', 404));
    }

    // Check if the user has an active membership
    const now = new Date();
    let activeMembership = null;
    user.membership_history.forEach(m => {
        if (m.membershipId && m.membershipId.toString() === membership._id.toString() && m.endDate > now) {
            activeMembership = m;
        }
    });

    if (activeMembership) {
        if (activeMembership.endDate > now) {
            // If active membership, extend the end date by 30 days
            activeMembership.endDate = new Date(activeMembership.endDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            await activeMembership.save({ validateBeforeSave: false });

            const message = `You have an existing membership, so your membership has been extended by 30 days. \n
            Membership Name: ${membership.planName} \n
            Amount: ${membership.price} \n
            Start Date: ${activeMembership.startDate} \n
            End Date: ${activeMembership.endDate}`;

            try {
                await sendEmail({
                    email: user.email,
                    subject: 'Membership Extended Successfully!',
                    message
                });
                return res.status(200).json({
                    status: 'success',
                    message: 'You already have an active membership, so it is extended by 30 days.',
                    data: {
                        activeMembership
                    }
                });
            } catch (err) {
                return next(new appError('Error while sending email!', 500));
            }
        }
    }
    // Create a new membership if no active membership is found or if it has expired
    const userMembership = await UserMembership.create({
        userId: user.id,
        membershipId: req.params.m_id,
    })
    if (!userMembership) {
        return next(new appError('Error while purchasing membership!', 500))
    }

    user.membership_plan.push(membership.id);
    user.membership_history.push(userMembership.id);

    await user.save({ validateBeforeSave: false });

    // Send email to user
    const message = `Congratulations! You have successfully purchased the membership. \n
    Membership Name: ${membership.planName} \n
    Amount: ${membership.price} \n
    Start Date: ${userMembership.startDate} \n
    End Date: ${userMembership.endDate}`;

    try {
        await sendEmail({
            email: user.email,
            subject: 'Membership Purchase Successful!',
            message
        });
        res.status(201).json({
            status: 'success',
            message: 'Membership purchase successful. Check your email for further details!',
            data: {
                userMembership
            }
        });
    } catch (err) {
        return next(new appError('Error while sending email!', 500));
    }
});
