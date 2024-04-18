const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const FriendRequest = require('../models/FriendRequest');
const mongoose = require('mongoose');
// const EmailTemplate = require('../models/emailtemplate');
const User = require('../models/User');
const Post = require('../models/Post');
const Like = require('../models/Like');
const Notification = require('../models/Notification');
const Message = require('../models/ChatMessage');
const ChatRoom = require('../models/ChatRoom');
const jwtSecret = "happy-faces";
const { v4: uuidv4 } = require('uuid');
const ChatMessages = require('../models/ChatMessage');
const Comment = require('../models/Comments');

function generateJWTToken(user) {
  const token = jwt.sign({ userId: user._id, email: user.email }, jwtSecret, { expiresIn: '11h' });
  return token;
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'jesica.i@mitrahsoft.com',
    pass: 'hfmt plus pvnz gzsm',
  },
});

function verifyAndDecodeAccessToken(accessToken, secretKey) {
  try {
    const decoded = jwt.verify(accessToken, secretKey);
    return decoded;
  } catch (error) {
    return null; // Return null if token verification fails
  }
}

const register = async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({ ...req.body, name, email, password: hashedPassword });
    await newUser.save();


    res.status(200).json({ ...req.body, userId: newUser._id, name: newUser.name, email: newUser.email });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(500).json({ code: 500, status: false, message: 'Invalid email or password' });
    }
    const token = generateJWTToken(user);
    res.status(200).json({ userId: user._id, email: user.email, token });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateUniquePasswordToken = (user) => {
  const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1h' });
  return token;
};

const sendPasswordResetEmail = (email, token) => {
  const mailOptions = {
    from: 'jesica.i@mitrahsoft.com',
    to: email,
    subject: 'Password Reset',
    html: `<p>Click the following link to reset your password:</p><p><a href="http://localhost:3000/reset-password?token=${token}">Reset Password</a></p>`,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending password reset email:', error);
    } else {
      console.log('Password reset email sent:', info.response);
    }
  });
};

const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const token = generateUniquePasswordToken(user);
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour
    await user.save();
    sendPasswordResetEmail(email, token);
    return res.status(200).json({ message: 'Password reset email sent successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token', token });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

const passwordRequirements = {
  minLength: 8,
  requiresSpecialChar: true,
  requiresUppercase: true,
};

const passwordNeeds = async (req, res) => {
  try {
    res.status(200).json(passwordRequirements);
  } catch (error) {
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const getRegData = async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(' ')[1];
    const user = verifyAndDecodeAccessToken(accessToken, jwtSecret);

    if (!user) {
      return res.status(401).json({ code: 401, status: false, message: 'Unauthorized' });
    }

    const existingUser = await User.findOne({ _id: user.userId });
    if (!existingUser) {
      return res.status(404).json({ code: 404, status: false, message: 'User not found' });
    }

    const friendIds = existingUser.friendsList.map((friendId) => friendId.toString());
    const userSuggestions = await User.find({
      _id: { $ne: user.userId, $nin: friendIds, $nin: existingUser.blockedUsers, $nin: existingUser.blockedBy },
    })
      .populate({
        path: 'friendRequests.friendRequestId',
        select: 'senderId receiverId status',
      });
    res.status(200).json(userSuggestions);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRegDataById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const regData = await User.findById(userId, { password: 0 });
    console.log("regData---->", regData)
    if (!regData) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(regData);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
}

const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("userId-->", userId, req.body);

    const { name, gender, city, state, knownLanguage, knownTechnology } = req.body;
    console.log("city-->", JSON.parse(city), req.body);

    const file = req.file; // Assuming only one file is uploaded
    console.log("file", file)
    const updatedProfileData = {
      name,
      gender,
      city: JSON.parse(city),
      state: JSON.parse(state),
      knownLanguage: JSON.parse(knownLanguage),
      knownTechnology: JSON.parse(knownTechnology),
    };
    console.log("updatedProfileData", updatedProfileData)
    if (file) {
      updatedProfileData.coverImage = file.filename; // Adjust this based on your file storage configuration
    }

    const updatedProfile = await User.findByIdAndUpdate(userId, updatedProfileData, { new: true });

    res.status(200).json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const sendFriendRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const accessToken = req.headers.authorization.split(' ')[1];
    const currentUserId = verifyAndDecodeAccessToken(accessToken, jwtSecret);
    const senderId = currentUserId.userId;
    const receiverId = userId;
    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!sender || !receiver) {
      throw new Error('Invalid senderId or receiverId');
    }

    const existingRequest = sender.friendRequests.find(
      (req) => req.senderId.equals(receiverId) && req.friendRequestId.status === 'Pending'
    );

    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already sent or pending.' });
    }

    const friendRequest = new FriendRequest({
      senderId,
      receiverId,
      status: 'Pending',
    });

    await friendRequest.save();

    if (!receiver.friendRequests.some((req) => req.senderId.equals(senderId))) {
      receiver.friendRequests.push({
        senderId,
        friendRequestId: friendRequest._id,
      });
    }

    if (!sender.friendRequests.some((req) => req.senderId.equals(receiverId))) {
      sender.friendRequests.push({
        senderId,
        friendRequestId: friendRequest._id,
      });
    }

    await sender.save();
    await receiver.save();

    const notification = new Notification({
      title: 'Friend Request',
      notificationType: 'friendRequest',
      notificationMsg: `You received a Friend Request from ${sender.name}`,
      friendRequestId: friendRequest._id,
      sender: senderId,
      receiver: receiverId,
      timestamp: new Date(),
      viewed: false
    });
    await notification.save();
    const getUser = await User.findById(receiverId)
    if (getUser.notificationPreferences.friendRequest === true) {
      getUser.notifications.push(notification._id)
      await getUser.save()
    }
    res.json({ message: 'Friend request sent successfully.', friendRequestStatus: 'Requested' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(' ')[1];
    const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

    const filteredFriendRequests = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(userData.userId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'friendRequests.senderId',
          foreignField: '_id',
          as: 'senderInfo',
        },
      },
      { $unwind: '$senderInfo' },
      {
        $lookup: {
          from: 'friendrequests',
          localField: 'friendRequests.friendRequestId',
          foreignField: '_id',
          as: 'friendRequestsInfo',
        },
      },
      { $unwind: '$friendRequestsInfo' },
      {
        $facet: {
          data: [
            {
              $match: {
                'friendRequestsInfo.status': { $ne: 'Accepted' },
                'friendRequestsInfo.senderId': { $ne: new mongoose.Types.ObjectId(userData.userId) },

              },
            },
            {
              $group: {
                _id: '$friendRequestsInfo.senderId',
                senderName: { $first: '$senderInfo.name' },
                receiverId: { $first: '$friendRequestsInfo.friendRequestId' },
                objectId: { $first: '$friendRequestsInfo._id' },
                status: { $first: '$friendRequestsInfo.status' },
                createdAt: { $first: '$friendRequestsInfo.createdAt' },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },

    ]);
    const uniqueRequests = {};
    filteredFriendRequests.data = filteredFriendRequests?.data?.filter(request => {
      const key = `${request._id}-${request.senderName}-${request.objectId}-${request.status}-${request.createdAt}`;
      if (uniqueRequests[key]) {
        return false;
      }
      uniqueRequests[key] = true;
      return true;
    });
    res.json(filteredFriendRequests);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFriends = async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(' ')[1];
    const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

    const user = await User.findById(userData.userId).populate({
      path: 'friendsList',
      select: 'name coverImage', // Include 'coverImage' field
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friends = user.friendsList.map(friend => ({
      _id: friend._id,
      name: friend.name,
      coverImage: friend.coverImage, // Add 'coverImage' field to the friend object
    }));

    res.json(friends);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


// const getFriends = async (req, res) => {
//   try {
//     const accessToken = req.headers.authorization.split(' ')[1];
//     const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

//     const userId = mongoose.Types.ObjectId(userData.userId);

//     const user = await User.aggregate([
//       {
//         $match: { _id: userId }
//       },
//       {
//         $lookup: {
//           from: 'friendrequests',
//           localField: 'friendRequests.senderId',
//           foreignField: '_id',
//           as: 'friendRequestsData'
//         }
//       },
//       {
//         $unwind: '$friendRequestsData'
//       },
//       {
//         $match: {
//           'friendRequestsData.senderId': { $ne: userId }
//         }
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'friendRequestsData.senderId',
//           foreignField: '_id',
//           as: 'friendData'
//         }
//       },
//       {
//         $unwind: '$friendData'
//       },
//       {
//         $project: {
//           _id: '$friendData._id',
//           name: '$friendData.name'
//           // Add other fields as needed
//         }
//       }
//     ]);

//     if (!user || !user[0]) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const friends = user.map(request => ({
//       _id: request._id,
//       name: request.name,
//       // Add other fields as needed
//     }));

//     res.json({ friends, user });
//   } catch (error) {
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

const processFriendRequest = async (req, res) => {
  try {
    const { senderId, userId, action } = req.params;
    const friendRequest = await FriendRequest.findOne({ senderId, receiverId: userId });
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    // Update friend request status
    friendRequest.status = action;
    await friendRequest.save();

    const receiverName = await User.findById(userId)

    // Add senderId to receiver's friendsList and vice versa if the request is accepted
    if (action === 'Accepted') {
      await User.findByIdAndUpdate(friendRequest.senderId, {
        $addToSet: { friendsList: friendRequest.receiverId },
      });

      await User.findByIdAndUpdate(friendRequest.receiverId, {
        $addToSet: { friendsList: friendRequest.senderId },
      });

      const notification = new Notification({
        title: 'Accept Request',
        notificationType: 'friendConnect',
        notificationMsg: `${receiverName.name} Accepted your friend Request`,
        sender: friendRequest.senderId,
        receiver: friendRequest.receiverId,
        timestamp: new Date(),
        viewed: true
      });
      await notification.save();
      const getUser = await User.findById(friendRequest.senderId)
      if (getUser.notificationPreferences.friendConnect === true) {
        getUser.notifications.push(notification._id)
        await getUser.save()
      }
    } else if (action === 'Rejected') {
      const receiverName = await User.findById(userId);
      const notification = new Notification({
        title: 'Reject Request',
        notificationType: 'friendConnect',
        notificationMsg: `${receiverName.name} rejected your friend request`,
        sender: friendRequest.senderId,
        receiver: friendRequest.receiverId,
        timestamp: new Date(),
        viewed: true
      });
      await notification.save();
      const senderUser = await User.findById(friendRequest.senderId);
      if (senderUser.notificationPreferences.friendConnect === true) {
        senderUser.notifications.push(notification._id);
        await senderUser.save();
      }
    } else {
      return res.status(400).json({ message: 'Invalid action parameter.' });
    }

    await User.updateMany(
      { _id: { $in: [friendRequest.senderId, friendRequest.receiverId] } },
      { $pull: { friendRequests: { senderId, friendRequestId: friendRequest._id } } },
      { multi: true }
    );

    // Find and delete the corresponding notification
    // await Notification.findOneAndDelete({
    //   sender: senderId,
    //   receiver: userId,
    //   notificationType: 'friendRequest'
    // });

    res.json({ message: `Friend request ${action.toLowerCase()}ed successfully.` });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error.' });
  }
};

const disconnectFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const accessToken = req.headers.authorization.split(' ')[1];
    const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

    const user = await User.findByIdAndUpdate(
      userData.userId,
      { $pull: { friendsList: friendId } },
      { new: true }
    );

    await User.findByIdAndUpdate(
      friendId,
      { $pull: { friendsList: userData.userId } },
      { new: true }
    );
    await user.save()
    res.json({ message: 'Disconnected successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const uploadPost = async (req, res) => {
  try {
    const { title, caption, user } = req.body;

    const { filename, path: filePath, mimetype } = req.file;

    const newPost = new Post({
      title,
      caption,
      user,
      file: {
        fileName: filename,
        filePath,
        fileType: mimetype,
      },
    });

    const savedPost = await newPost.save();

    // Retrieve user's friends
    const userWithFriends = await User.findById(user).populate('friendsList');
    if (!userWithFriends) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create notifications for each friend
    const notifications = userWithFriends.friendsList.map(async (friend) => {
      const notification = new Notification({
        title: 'New Post Added',
        notificationType: 'newPost',
        notificationMsg: `${userWithFriends.name} added a new post`,
        sender: user,
        receiver: friend._id,
        postId: savedPost._id,
        timestamp: new Date(),
      });
      await notification.save();
      const senderUser = await User.findById(friend._id);
      if (senderUser.notificationPreferences.newPost === true) {
        senderUser.notifications.push(notification._id);
        await senderUser.save();
      }
      return notification;
    });
    // Save notifications to the Notification model
    const savedNotifications = await Promise.all(notifications);
    res.status(201).json(savedNotifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find().populate('user', 'name coverImage').populate('likes').sort({ createdAt: -1 })
    console.log("posts------------>", posts)
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      caption: post.caption,
      user: post.user.name,
      coverImage: post.user.coverImage,
      file: post.file,
      like: post.likes,
      count: post.likes?.length,
      comments: post.comments,
      createdAt: post.createdAt,
      __v: post.__v
    }));
    res.status(200).json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getPostById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const posts = await Post.find({ user: userId }).populate('user', 'name').populate('likes');
    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      caption: post.caption,
      user: post.user.name,
      file: post.file,
      like: post.likes,
      count: post.likes?.length,
      comments: post.comments,
      createdAt: post.createdAt,
      __v: post.__v
    }));
    res.status(200).json(formattedPosts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const notifyToUser = await User.findById(post.user)
    const Senderuser = await User.findById(userId)
    const existingLike = await Like.findOne({ user: userId, post: postId });
    if (existingLike) {
      await Like.findOneAndDelete({ user: userId, post: postId });

      post.likes = post.likes.filter(likeId => likeId.toString() !== existingLike._id.toString());
      await post.save();

      // Find and delete the corresponding notification
      await Notification.findOneAndDelete({
        sender: userId,
        receiver: notifyToUser._id,
        postId: postId,
        notificationType: 'likePost'
      });

      res.status(200).json({ message: 'Post disliked successfully' });
    } else {
      const newLike = new Like({ user: userId, post: postId });
      await newLike.save();

      post.likes.push(newLike._id);
      await post.save();

      const notification = new Notification({
        title: 'Liked your post ',
        notificationType: 'likePost',
        notificationMsg: `${Senderuser.name} has liked your post`,
        sender: userId,
        receiver: notifyToUser._id,
        postId: postId,
        timestamp: new Date(),
      });
      await notification.save();
      const senderUser = await User.findById(notifyToUser._id);
      if (senderUser.notificationPreferences.likePost === true) {
        senderUser.notifications.push(notification._id);
        await senderUser.save();
      }
      res.status(200).json({ message: 'Post liked successfully' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
const likeComment = async (req, res) => {
  try {
    const { userId } = req.body; 
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const userIndex = comment.likes.findIndex(like => like.user.toString() === userId);

    if (userIndex === -1) {
      comment.likes.push({ user: userId });
    } else {
      comment.likes.splice(userIndex, 1);
    }
    await comment.save();

    res.status(200).json({ message: 'Like status toggled successfully' });
  } catch (error) {
    console.error('Error toggling like on comment:', error.message);
    res.status(500).json({ error: 'Server error' });
  }
}

const getNotificationsController = async (req, res) => {
  try {
    const receiverId = req.query.receiverId;
    const userDetails = await User.findById(receiverId);

    const notifications = await Notification.find({ '_id': { $in: userDetails.notifications.flat() } })
      .populate({
        path: 'friendRequestId',
        select: 'senderId receiverId status',
      })
      .populate({
        path: 'postId',
        select: 'file'
      })
      .sort({ time: -1 });

    // Set viewed to true for all fetched notifications
    await Notification.updateMany({ '_id': { $in: notifications.map(notification => notification._id) } }, { viewed: true });

    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const notificationPreference = async (req, res) => {
  try {
    const { userId, notificationPreferences } = req.body;

    // Assuming you have a way to validate userId or ensure its authenticity

    const user = await User.findByIdAndUpdate(userId, { notificationPreferences }, { new: true });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Notification preferences updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getNotificationPreference = async (req, res) => {
  try {
    const userId = req.params.userId;
    if (!userId) {
      return res.status(400).json({ message: 'User ID is missing from the request params' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.notificationPreferences);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

const notificationDetails = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    const postDetails = await Post.findById(notification.postId).populate('user', 'name').populate('likes');
    res.status(200).json(postDetails);
  } catch (error) {
    console.error('Error fetching notification details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const notificationUserDetails = async (req, res) => {
  try {
    const notificationId = req.params.id;
    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const senderDetails = await User.findById(notification.sender);
    const posts = await Post.find({ user: notification.sender }).populate('likes');

    const formattedPosts = posts.map(post => ({
      _id: post._id,
      title: post.title,
      caption: post.caption,
      user: post.user.name,
      file: post.file,
      like: post.likes,
      count: post.likes?.length,
      comments: post.comments,
      createdAt: post.createdAt,
      __v: post.__v
    }));

    res.status(200).json({ senderDetails, formattedPosts });
  } catch (error) {
    console.error('Error fetching notification details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const notificationCount = async (req, res) => {
  try {
    const userId = req.params.id;
    const unreadCount = await Notification.countDocuments({
      receiver: userId,
      viewed: false
    });
    res.json({ count: unreadCount });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch notification count' });
  }
}

const postMessages = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    // const message = new Message({
      // sender: req.user._id,
      // receiver: receiverId,`
      // content
    // });
    // await message.save();
    // res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const generateRoomId = () => {
  return uuidv4(); // Generate a UUID (v4)
};

const createChatRoom = async (req, res) => {
  try {
    const { receiverId, userId } = req.params;

    let chatRoom = await ChatRoom.findOne({
      $or: [
        { receiverId: receiverId, senderId: userId },
        { receiverId: userId, senderId: receiverId }
      ]
    });

    if (!chatRoom) {
      const roomId = generateRoomId();
      chatRoom = new ChatRoom({
        receiverId: receiverId,
        senderId: userId,
        roomId: roomId,
      });
      await chatRoom.save();
    }

    res.json({ roomId: chatRoom.roomId });
  } catch (error) {
    console.error('Error creating or finding chat room:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getRoomId = async (req, res) => {
  const { receiverId, userId } = req.params;

  try {
    const chatRoom = await ChatRoom.findOne({
      $or: [
        { receiverId: receiverId, senderId: userId },
        { receiverId: userId, senderId: receiverId }
      ]
    });

    if (!chatRoom) {
      return res.status(404).json({ error: 'Room not found for receiverId' });
    }

    res.json({ roomId: chatRoom.roomId });
  } catch (error) {
    console.error('Error fetching roomId:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessageHistory = async (req, res) => {
  const { roomId } = req.params;
  try {
    const messages = await ChatMessages.find({ 'messages.roomId': roomId })
      .populate('messages.sender.id', 'coverImage')
      .populate('messages.receiver.id', 'coverImage');
    console.log("messages------->", messages)
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages in room:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMessageCount = async (req, res) => {
  const { userId } = req.params;
  try {
    const messageCount = await ChatMessages.countDocuments({
      $or: [
        { 'messages.sender.id': userId, 'messages.viewed': false },
        { 'messages.receiver.id': userId, 'messages.viewed': false }
      ]
    });
    res.json({ messageCount });
  } catch (error) {
    console.error('Error retrieving message count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const blockUsers = async (req, res) => {
  const { userId } = req.params;
  const { friendId } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { $addToSet: { blockedUsers: friendId } });
    await User.findByIdAndUpdate(friendId, { $addToSet: { blockedBy: userId } });

    await User.findByIdAndUpdate(userId, { $pull: { friendsList: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friendsList: userId } });
    res.status(200).send({ message: 'Friend blocked successfully' });
  } catch (error) {
    console.error('Error blocking friend:', error.message);
    res.status(500).send({ error: 'Internal server error' });
  }
}

const unBlockUsers = async (req, res) => {
  const { userId } = req.params;
  const { friendId } = req.body;
  try {
    await User.findByIdAndUpdate(userId, { $pull: { blockedUsers: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { blockedBy: userId } });
    await User.findByIdAndUpdate(userId, { $pull: { blockedBy: friendId } });
    res.status(200).send({ message: 'Friend blocked successfully' });
  } catch (error) {
    console.error('Error blocking friend:', error.message);
    res.status(500).send({ error: 'Internal server error' });
  }
}

const getBlockedUsers = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await User.findById(userId).populate('blockedUsers', 'name coverImage');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json(user.blockedUsers);
  } catch (error) {
    console.error('Error fetching blocked users:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const handleComment = async (req, res) => {
  try {
    const { postId, content, userId } = req.body;
    // Save the comment to the database
    const comment = await Comment.create({ postId, userId, content });
    // io.to(postId).emit('new-comment', comment);
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Error saving comment:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
}

const getAllComment = async (req, res) => {
  const { imageId } = req.params;
  try {
    const comments = await Comment.find({ postId: imageId })
      .populate({
        path: 'userId',
        select: 'name coverImage'
      });

    const formatedComments = comments.map(comment => ({
      _id:comment.id,
      content: comment.content,
      like: comment.likes,
      count: comment.likes?.length,
      name: comment.userId.name,
      coverImage: comment.userId.coverImage,
    }))

    res.status(200).json(formatedComments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

module.exports = {
  register,
  login,
  forgetPassword,
  resetPassword,
  passwordNeeds,
  getRegData,
  getRegDataById,
  updateProfile,
  sendFriendRequest,
  processFriendRequest,
  disconnectFriend,
  getFriendRequests,
  getFriends,
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
  getRoomId,
  createChatRoom,
  getMessageHistory,
  getMessageCount,
  blockUsers,
  unBlockUsers,
  getBlockedUsers,
  handleComment,
  getAllComment
};