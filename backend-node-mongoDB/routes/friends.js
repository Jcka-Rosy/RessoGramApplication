
const express = require('express');
const router = express.Router();
const { sendFriendRequest} = require('../controllers/friendsController');

router.post('/send-friend-request/:userId', sendFriendRequest);

module.exports = router;
