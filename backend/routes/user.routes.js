const express = require("express");
const protectRoute = require("../middleware/auth.middleware");
const router = express.Router();

router.use(protectRoute);

router.get("/", getRecommendedUsers);
router.get("/friends", getMyFriends);
router.post("/friend-request/:id", sendFriendrequest);

module.exports = router;