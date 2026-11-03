const express = require('express');
const appointmentController = require('../controllers/appointmentController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', appointmentController.createAppointment);
router.get('/', appointmentController.getMyAppointments);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.deleteAppointment);

module.exports = router;
