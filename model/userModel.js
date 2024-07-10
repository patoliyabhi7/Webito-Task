const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcrypt')
const crypto = require('crypto')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please enter your name!']
    },
    email: {
        type: String,
        required: [true, 'Please enter your email!'],
        unique: true,
        validate: [validator.isEmail, 'Please enter a valid email!'],
        lowercase: true
    },
    username: {
        type: String,
        required: [true, 'Please enter your username!'],
        unique: true,
        lowercase: true,
    },
    password: {
        type: String,
        required: [true, 'Please enter your password!'],
        minlength: 5
    },
    confirmPassword: {
        type: String,
        required: [true, 'Please confirm your password!'],
        validate: {
            validator: function(el){
                return el === this.password;
            },
            message: 'Passwords are not the same!'
        }
    },
    gender: {
        type: String,
        required: [true, 'Gender is required!'],
        enum: ['Male', 'Female']
    },
    age: {
        type: Number,
        min: 18
    },
    phone: { 
        type: String,
        validate: [validator.isMobilePhone, 'Please enter a valid phone number!'],
        unique: true
    },
    city: {
        type: String,
    },
    country: {
        type: String,
    },
    education: {
        type: String,
    },
    membership_plan: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership'
    }],
    membership_history: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserMembership'
    }],
})

userSchema.pre('save', async function(next){
    if(!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
})

userSchema.methods.correctPassword = async function(enteredPassword, userPassword){
    return await bcrypt.compare(enteredPassword, userPassword)
}

const User = mongoose.model('User', userSchema)
module.exports = User;