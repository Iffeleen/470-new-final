const express = require('express');
const router = express.Router();
const { registerCompany, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register-company', registerCompany);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
