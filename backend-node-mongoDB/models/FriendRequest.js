const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', ''],
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// friendRequestSchema.index({ senderId: 1, receiverId: 1 }, { unique: true });

const FriendRequest = mongoose.model('FriendRequest', friendRequestSchema);

module.exports = FriendRequest;