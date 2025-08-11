const express = require("express");
const protectRoute = require("../middleware/auth.middleware");
const genStreamToken = require("../controllers/chat.controller");
const router = express.Router();

router.get("/token", protectRoute, genStreamToken);

module.exports = router;