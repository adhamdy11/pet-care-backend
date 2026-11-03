const express = require('express');
const reminderController = require('../controllers/reminderController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', reminderController.createReminder);
router.get('/pet/:petId', reminderController.getRemindersByPet);
router.put('/:id', reminderController.updateReminder);
router.delete('/:id', reminderController.deleteReminder);

module.exports = router;
