const express = require("express");
const userMembershipController = require("./../controllers/userMembershipController");
const userController = require("./../controllers/userController");
const upload = require("../middlewares/multerMiddleware");

const router = express.Router();

// Membership
router.post("/purchaseMembership/:m_id", userController.verifyJWT, userMembershipController.purchaseMembership);
router.get("/getMyMemberships", userController.verifyJWT, userMembershipController.getMyMemberships);
router.get("/getMembershipDetailsByUId/:id", userMembershipController.getMembershipDetailsByUId)
router.get("/getMembershipSalesReport", userMembershipController.getMembershipSalesReport)
router.get("/export_transactions", userMembershipController.export_transactions)
router.post("/uploadFile", upload.single('file1'), userMembershipController.uploadFile)

module.exports = router;