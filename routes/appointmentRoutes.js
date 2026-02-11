var express = require('express');
var router = express.Router();

var appointmentController = require('../controllers/appointmentController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;

router.post('/', verifyToken, appointmentController.createAppointment);
router.get('/', verifyToken, appointmentController.getMyAppointments);
router.put('/:id', verifyToken, appointmentController.updateAppointment);
router.delete('/:id', verifyToken, appointmentController.deleteAppointment);

module.exports = router;
