const express = require('express');
const router = express.Router();
const { getClaims, createClaim, updateClaim, deleteClaim } = require('../controllers/claimController');
const auth = require('../middleware/auth');

router.get('/', auth, getClaims);
router.post('/', auth, createClaim);
router.put('/:id', auth, updateClaim);
router.delete('/:id', auth, deleteClaim);

module.exports = router;
