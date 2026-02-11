var express = require('express');
var router = express.Router();

var recordController = require('../controllers/recordController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;

router.post('/', verifyToken, recordController.addRecord);
router.get('/pet/:petId', verifyToken, recordController.getRecordsByPet);

module.exports = router;
