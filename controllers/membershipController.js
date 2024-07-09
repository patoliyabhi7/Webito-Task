const appError = require('../utils/appError')
const catchAsync = require('../utils/catchAsync')
const Membership = require('./../model/membershipModel')

exports.addPlan = catchAsync(async (req, res, next) => {
    const { planName, price, roi } = req.body;
    if (!planName || !price || !roi) {
        return next(new appError('Please provide all the details(planeName, price & roi)', 400))
    }
    const plan = await Membership.create({
        planName,
        price,
        roi
    })
    res.status(200).json({
        status: 'Plan added successfully!!',
        data: {
            plan
        }
    })
})

exports.getAllPlans = catchAsync(async (req, res, next) => {
    const plans = await Membership.find()
    res.status(200).json({
        status: 'Plans fetched successfully',
        count: plans.length,
        data: {
            plans
        }
    })
})

exports.getPlanById = catchAsync(async (req, res, next) => {
    const plan = await Membership.findById(req.params.id)
    if (!plan) {
        return next(new appError('No plan found with this ID', 404))
    }
    res.status(200).json({
        status: 'Plan fetched successfully',
        data: {
            plan
        }
    })
})

exports.removePlan = catchAsync(async (req, res, next) => {
    const plan = await Membership.findByIdAndDelete(req.params.id)
    if (!plan) {
        return next(new appError('No plan found with this ID', 404))
    }
    res.status(200).json({
        status: 'Plan deleted successfully',
        data: null
    })
})

exports.updatePlan = catchAsync(async (req, res, next) => {
    const plan = await Membership.findByIdAndUpdate(req.params.id, { planName: req.body.planName, price: req.body.price, roi: req.body.roi }, {new:true, runValidators: true } )
    if(!plan){
        return next(new appError('No plan found with this ID!', 404))
    }
    res.status(200).json({
        status: 'Plan updated successfully',
        data: {
            plan
        }
    })
})