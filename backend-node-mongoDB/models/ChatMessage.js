const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    receiver: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: true
        }
    },
    roomId: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    seenBy: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    ],
    viewed: {
        type: Boolean,
        default: false
    },
    sharedImage: {
        imageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Post',
            // required: false
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // required: false
        },
        friendIds: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }
});

const sessionChatSchema = new mongoose.Schema({
    messages: [messageSchema],
});

// Use PascalCase for model name
const ChatMessages = mongoose.model('ChatMessages', sessionChatSchema);

module.exports = ChatMessages;