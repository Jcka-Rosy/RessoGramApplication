const express = require('express');
const router = express.Router();
const { 
    register, 
    login, 
    getRegData, 
    getRegDataById , 
    sendFriendRequest, 
    getFriendRequests,
    getFriends,
    // acceptFriendRequest,
    // rejectFriendRequest, 
    processFriendRequest,
    disconnectFriend,
    forgetPassword, 
    resetPassword, 
    passwordNeeds} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/get-reg-data', getRegData),
router.get('/get-reg-data/:userId', getRegDataById),

router.post('/send-friend-request/:userId', sendFriendRequest);
router.get('/get-friend-requests', getFriendRequests);
// router.post('/accept-friend-request/:senderId', acceptFriendRequest);
// router.post('/reject-friend-request/:requestId', rejectFriendRequest);
router.post('/process-friend-request/:senderId/:action', processFriendRequest);
router.post('/disconnect-friend/:friendId', disconnectFriend);
router.get('/get-friends', getFriends)

// router.post('/create-template', createTemplate)
router.post('/forget-password', forgetPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/password-requirements', passwordNeeds);


module.exports = router;