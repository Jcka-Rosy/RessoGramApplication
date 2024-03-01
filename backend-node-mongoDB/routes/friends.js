
const express = require('express');
const router = express.Router();
const { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendsList, disconnectFriend } = require('../controllers/friendsController');

router.post('/send-friend-request/:userId', sendFriendRequest);
// router.post('/acceptRequest/:requestId', acceptFriendRequest);
// router.post('/rejectRequest/:requestId', rejectFriendRequest);
// router.get('/list/:userId', getFriendsList);
// router.post('/disconnect/:friendId', disconnectFriend);

module.exports = router;
