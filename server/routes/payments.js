const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getAll, getById, getSummary, create, verify } = require('../controllers/paymentController');

// IMPORTANT: /summary MUST be before /:id to avoid Express matching "summary" as an id
router.get('/', getAll);
router.get('/summary', getSummary);
router.get('/:id', getById);
router.post('/', auth, create);
router.put('/:id/verify', auth, verify);

module.exports = router;
