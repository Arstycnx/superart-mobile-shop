const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getAll, getById, getRepairs, getPayments, create, update, remove,
} = require('../controllers/customerController');

router.get('/', getAll);
router.get('/:id', getById);
router.get('/:id/repairs', getRepairs);
router.get('/:id/payments', getPayments);
router.post('/', auth, create);
router.put('/:id', auth, update);
router.delete('/:id', auth, remove);

module.exports = router;
