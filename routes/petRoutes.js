var express = require('express');
var router = express.Router();

var petController = require('../controllers/petController');
var verifyToken = require('../middleware/authMiddleware').verifyToken;

router.post('/', verifyToken, petController.createPet);
router.get('/', verifyToken, petController.getMyPets);
router.put('/:id', verifyToken, petController.updatePet);
router.delete('/:id', verifyToken, petController.deletePet);

module.exports = router;
