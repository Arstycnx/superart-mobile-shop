const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getAll, getLowStock, getById, create, update, remove,
} = require('../controllers/productController');

// IMPORTANT: /alerts/low-stock must come BEFORE /:id
router.get('/alerts/low-stock', getLowStock);

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', auth, create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);

module.exports = router;
