const express = require('express');
const petController = require('../controllers/petController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(verifyToken);

router.post('/', petController.createPet);
router.get('/', petController.getMyPets);
router.put('/:id', petController.updatePet);
router.delete('/:id', petController.deletePet);

module.exports = router;
