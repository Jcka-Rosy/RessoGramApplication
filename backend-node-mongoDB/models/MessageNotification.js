const mongoose = require('mongoose');

const messageNotificationSchema = new mongoose.Schema({
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
    messageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMessages',
        required: true
    },
    date: {
        type: Date,
        default: Date.now,
    },
    viewed: {
        type: Boolean,
        default: false
    }
});

const MessageNotification = mongoose.model('MessageNotification', messageNotificationSchema);

module.exports = MessageNotification;