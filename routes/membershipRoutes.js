const express = require("express");
const membershipController = require("./../controllers/membershipController");

const router = express.Router();

router.post("/addPlan", membershipController.addPlan);
router.get("/getAllPlans", membershipController.getAllPlans);
router.get("/getPlan/:id", membershipController.getPlanById);
router.post("/removePlan/:id", membershipController.removePlan);
router.post("/updatePlan/:id", membershipController.updatePlan);

module.exports = router;