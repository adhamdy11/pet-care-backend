var express = require('express');
var router = express.Router();

var adminController = require('../controllers/adminController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;
var requireAdmin = require('../middleware/adminMiddleware').requireAdmin;

router.get('/all-users', verifyToken, requireAdmin, adminController.getAllUsers);
router.put('/update-role/:id', verifyToken, requireAdmin, adminController.updateRole);

module.exports = router;
