const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
    getAll, getById, trackRepair, create, updateStatus, addParts, createRequest,
} = require('../controllers/repairController');

// Public routes — MUST come before /:id
router.get('/track/:code', trackRepair);
router.post('/request', createRequest);

// Protected & standard routes
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', auth, create);
router.put('/:id/status', auth, updateStatus);
router.post('/:id/parts', auth, addParts);

module.exports = router;
