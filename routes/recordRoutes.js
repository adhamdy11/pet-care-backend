const express = require('express');
const recordController = require('../controllers/recordController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', recordController.addRecord);
router.get('/pet/:petId', recordController.getRecordsByPet);
router.put('/:id', recordController.updateRecord);
router.delete('/:id', recordController.deleteRecord);

module.exports = router;
