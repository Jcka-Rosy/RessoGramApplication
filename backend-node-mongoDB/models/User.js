const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
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
  activeStatus: {
    type: Boolean,
    default: true,
  },
  isDelete: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const User = mongoose.model('User', userSchema);

module.exports = User;