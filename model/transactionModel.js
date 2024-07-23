const mongoose = require('mongoose')

const transactionSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    userMembershipId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserMembership',
        required: [true, 'User Membership ID is required']
    },
    transactionType: {
        type: String,
        enum: ['credit', 'debit'],
        required: [true, 'Transaction Type is required']
    },
    amount: {
        type: Number,
        required: [true, 'Amount is required!']
    },
    transactionDate: {
        type: Date,
        default: Date.now()
    },
    note:{
        type: String
    },
    blob: {
        type: Buffer
    }
})

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;