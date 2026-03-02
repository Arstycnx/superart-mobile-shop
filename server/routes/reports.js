const express = require('express');
const router = express.Router();
const {
    getDashboard, getRevenue, getRepairTypes,
    getTopProducts, getCancellations, getSummary,
} = require('../controllers/reportController');

router.get('/dashboard', getDashboard);
router.get('/revenue', getRevenue);
router.get('/repair-types', getRepairTypes);
router.get('/top-products', getTopProducts);
router.get('/cancellations', getCancellations);
router.get('/summary', getSummary);

module.exports = router;
