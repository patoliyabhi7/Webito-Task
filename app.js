const express = require('express')
const userRouter = require('./routes/userRoutes.js');
const membershipRouter = require('./routes/membershipRoutes.js');
const userMembershipRouter = require('./routes/userMembershipRoutes.js');
const cookieParser = require('cookie-parser');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
    res.status(200).send("Welcome")
})

app.use('/api/v1/users', userRouter);
app.use('/api/v1/membership', membershipRouter);
app.use('/api/v1/userMembership', userMembershipRouter);

module.exports = app;