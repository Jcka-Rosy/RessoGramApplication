const express = require('express');
const router = express.Router();
const { register, login, getRegData, getRegDataById , sendFriendRequest, forgetPassword, resetPassword, passwordNeeds} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/get-reg-data', getRegData),
router.get('/get-reg-data/:userId', getRegDataById),

router.post('/send-friend-request/:userId', sendFriendRequest);
// router.post('/create-template', createTemplate)
router.post('/forget-password', forgetPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/password-requirements', passwordNeeds);


module.exports = router;