const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    // required: true,
  },
  caption: {
    type: String,
    // required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  }],
  file: {
    // Define the file field to store file information
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Like',
  }],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;