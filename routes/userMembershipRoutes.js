const express = require("express");
const userMembershipController = require("./../controllers/userMembershipController");
const userController = require("./../controllers/userController");


const router = express.Router();

// Membership
router.post("/purchaseMembership/:m_id", userController.verifyJWT, userMembershipController.purchaseMembership);

module.exports = router;