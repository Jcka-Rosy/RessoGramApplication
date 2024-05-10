const express = require('express');
const router = express.Router();
const { updateProfile } = require('../controllers/profileController');

router.put('/update-profile/:userId', updateProfile)

router.put('/:userId', updateProfile);

module.exports = router;
