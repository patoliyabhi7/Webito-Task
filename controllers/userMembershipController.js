const User = require('./../model/userModel')
const Membership = require('./../model/membershipModel')
const UserMembership = require('./../model/userMembershipModel')
const appError = require('./../utils/appError')
const catchAsync = require('./../utils/catchAsync')
const sendEmail = require('./../utils/email');

exports.purchaseMembership = catchAsync(async (req, res, next) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        return next(new appError('User not found or not logged in!!', 404))
    }
    const membership = await Membership.findById(req.params.m_id);
    if (!membership) {
        return next(new appError('Membership not found!', 404))
    }
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
    try{
        await sendEmail({
            email: user.email,
            subject: 'Membership Purchase Successful!',
            message
        });
        res.status(200).json({
            status: 'success',
            message: 'Membership purchase successfull. Check your email for further details!'
        })
    }
    catch(err){
        return next(new appError('Error while sending email!', 500))
    }
});