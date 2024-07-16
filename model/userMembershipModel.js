const mongoose = require('mongoose');

const userMembershipSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    membershipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership',
        required: [true, 'Membership ID is required']
    },
    purchasedOn: {
        type: Date,
        default: Date.now,
        required: [true, 'Purchase date is required']
    },
    maturityDate: {
        type: Date,
        required: [true, 'Maturity date is required']
    },
    investedAmount: {
        type: Number,
        required: [true, 'Invested amount is required']
    },
    roiAmount: {
        type: Number,
        required: [true, 'ROI amount is required']
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Matured'],
        default: 'Active'
    },
    transactionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction'
    }
})

const UserMembership = mongoose.model('UserMembership', userMembershipSchema)
module.exports = UserMembership