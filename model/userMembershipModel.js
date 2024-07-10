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
    startDate: {
        type: Date,
        default: Date.now(),
        required: [true, 'Start date is required']
    },
    endDate: {
        type: Date,
        default: function() {
            return Date.now() + 30*24*60*60*1000;
        },
        required: [true, 'End date is required']
    },
    purchasedOn: {
        type: Date,
        default: Date.now,
        required: [true, 'Purchase date is required']
    }
})

const UserMembership = mongoose.model('UserMembership', userMembershipSchema)
module.exports = UserMembership