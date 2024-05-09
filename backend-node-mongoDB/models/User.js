const mongoose = require('mongoose');
const Post = require('./Post');
const Comment = require('./Comments');

const userSchema = new mongoose.Schema({
  // Existing fields
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', ''],
  },
  city: {
    value: String,
    label: String,
  },
  state: {
    value: String,
    label: String,
  },
  knownLanguage: [
    {
      value: String,
      label: String,
    }
  ],
  knownTechnology: [
    {
      value: String,
      label: String,
    }
  ],
  coverImage: {
    type: String,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  friendRequests: [
    {
      senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      friendRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'FriendRequest',
      },
    },
  ],
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FriendRequest'
  }],
  friendsList: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  }],
  notificationPreferences: {
    friendRequest: { type: Boolean, default: true },
    friendConnect: { type: Boolean, default: true },
    likePost: { type: Boolean, default: true },
    newPost: { type: Boolean, default: true },
  },
  activeStatus: {
    type: Boolean,
    default: true,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  blockedBy:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  sharedImages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post', // Assuming you have a separate image model named 'Image'
}],
});

userSchema.virtual('posts', {
  ref: 'Post',
  localField: '_id',
  foreignField: 'user',
});

userSchema.virtual('comments', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'user',
});

const User = mongoose.model('User', userSchema);

module.exports = User;