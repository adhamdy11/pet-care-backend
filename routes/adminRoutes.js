const express = require('express');
const adminController = require('../controllers/adminController');
const { verifyToken } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/adminMiddleware');

const router = express.Router();

// Every admin route needs a logged-in user with the admin role.
router.use(verifyToken, requireAdmin);

router.get('/all-users', adminController.getAllUsers);
router.put('/update-role/:id', adminController.updateRole);

module.exports = router;
