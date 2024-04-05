const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    title: {
        type: String,
        // required: true
    },
    notificationType: {
        type: String,
        enum: ['friendRequest', 'friendConnect', 'likePost', 'newPost'],
        required: true
    },
    notificationMsg: {
        type: String,
        // required: true
    },
    date: {
        type: Date,
        default: Date.now,
        // required: true
    },
    time: {
        type: String, // Change to String if you want to store as a string
        default: () => new Date().toLocaleTimeString('en-US', { hour12: false }),
        // required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    friendRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FriendRequest',
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    viewed: {
        type: Boolean,
        default: false
    }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
