const mongoose = require('mongoose')

const membershipSchema = mongoose.Schema({
    planName: {
        type: String,
        enum: ['Silver', 'Gold', 'Platinum'],
        required: [true, 'Plan Name is required'],
    },
    price: {
        type: Number,
        required: [true, 'Amount is required'],
    },
    roi: {
        type: Number,
        required: [true, 'ROI is required'],
    },
    validity: {
        type: Number,
        required: [true, 'Validity is required'],
    },
})

const Membership = mongoose.model('Membership', membershipSchema);
module.exports = Membership;