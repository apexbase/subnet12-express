// In app.js or /src/routes/vmRoutes.js
const authenticate = require("../middleware/auth");

const express = require("express");
const router = express.Router();
const { createVM, updateVM } = require("../controllers/vmController");

// Apply the authenticate middleware to all routes in this router
router.use(authenticate);

router.post("/", createVM);
router.post("/update", updateVM);

module.exports = router;
