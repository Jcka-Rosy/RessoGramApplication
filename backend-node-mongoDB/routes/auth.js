const express = require('express');
const router = express.Router();
const {
    register,
    login,
    forgetPassword,
    resetPassword,
    passwordNeeds,
    getRegData,
    getRegDataById,
    sendFriendRequest,
    getFriendRequests,
    getFriends,
    processFriendRequest,
    disconnectFriend,
    uploadPost,
    getAllPosts,
    getPostById,
    likePost,
    likeComment,
    getNotificationsController,
    notificationPreference,
    getNotificationPreference,
    notificationDetails,
    notificationUserDetails,
    notificationCount,
    postMessages,
    createChatRoom,
    getRoomId,
    getMessageHistory,
    getMessageCount,
    blockUsers,
    unBlockUsers,
    getBlockedUsers,
    handleComment,
    getAllComment,
    updateProfile} = require('../controllers/authController');

const multer = require("multer");
const path = require("path");
const fs = require("fs");

function createMulterMiddleware(fieldName, uploadDir) {
    console.log("fieldName---->", fieldName)
    return multer({
        storage: multer.diskStorage({
            destination: function (req, file, callback) {
                fs.mkdirSync(path.join(__dirname, `../${uploadDir}`), { recursive: true });
                callback(null, path.join(__dirname, `../${uploadDir}`));
            },
            filename: function (req, file, callback) {
                const uniquePrefix = Date.now() + Math.random().toString();
                const sanitizedFileName = file.originalname.replace(/.*?:\/\//g, "").replace(/\s+/g, '-').replace(/[^\w\s.-]/g, "").toLowerCase();
                callback(null, `${uniquePrefix}-${sanitizedFileName}`);
            },
        }),
        limits: { fieldSize: 25 * 1024 * 1024 }
    }).single(fieldName);
};

router.post('/register', register);
router.post('/login', login);
router.post('/forget-password', forgetPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/password-requirements', passwordNeeds);
router.get('/get-reg-data', getRegData),
router.get('/get-reg-data/:userId', getRegDataById),
router.put('/update-profile/:userId', createMulterMiddleware('file', 'uploads/profile'), updateProfile)

router.post('/send-friend-request/:userId', sendFriendRequest);
router.get('/get-friend-requests', getFriendRequests);
router.post('/process-friend-request/:senderId/:userId/:action', processFriendRequest);
router.post('/disconnect-friend/:friendId', disconnectFriend);
router.get('/get-friends', getFriends)
router.get('/all-notifications', getNotificationsController)

router.post('/upload-post', createMulterMiddleware('file', 'uploads/post'), uploadPost)
router.get('/get-all-post', getAllPosts)
router.get('/get-all-post/:userId', getPostById)
router.post('/like-post/:postId/like', likePost)
router.post('/comments', handleComment)
router.get('/comments/image/:imageId', getAllComment)
router.post('/like-comment/:commentId/like', likeComment)
router.post('/notification-preferences',notificationPreference)
router.get('/get-notification-preferences/:userId', getNotificationPreference)
router.get('/get-notification-details/:id', notificationDetails)
router.get('/get-user-notification-details/:id', notificationUserDetails)
router.get('/get-notification-count/:id', notificationCount)
router.post('/post-messages', postMessages)
router.post('/create-chat-room/:receiverId/:userId', createChatRoom)
router.get('/get-roomId/:receiverId/:userId', getRoomId)
router.get('/get-message-history/:roomId', getMessageHistory)
router.get('/get-message-count/:userId', getMessageCount)
router.post('/users/:userId/block', blockUsers)
router.post('/users/:userId/unblock', unBlockUsers)
router.get('/get-blocked-users/:userId', getBlockedUsers)

module.exports = router;