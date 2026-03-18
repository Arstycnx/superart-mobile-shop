const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    getAll, getById, trackRepair, create, updateStatus, addParts, createRequest, notifyCustomer, deleteRepair, togglePayment, uploadPhoto
} = require('../controllers/repairController');

// Public routes — MUST come before /:id
router.get('/track/:code', trackRepair);
router.post('/request', upload.fields([
    { name: 'before_photo', maxCount: 1 },
    { name: 'after_photo', maxCount: 1 }
]), createRequest);

// Protected & standard routes
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', auth, create);
router.put('/:id/status', auth, updateStatus);
router.put('/:id/payment', auth, togglePayment);
router.post('/:id/notify', auth, notifyCustomer);
router.post('/:id/parts', auth, addParts);
router.post('/:id/upload-photo', auth, upload.single('photo'), uploadPhoto);
router.delete('/:id', auth, deleteRepair);

module.exports = router;
