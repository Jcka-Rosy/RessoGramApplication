const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const FriendRequest = require('../models/FriendRequest');
const mongoose = require('mongoose');
// const EmailTemplate = require('../models/emailtemplate');
const User = require('../models/User');
const jwtSecret = "happy-faces";

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
    console.error(error);
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
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
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
      _id: { $ne: user.userId, $nin: friendIds },
    })
      .populate({
        path: 'friendRequests.friendRequestId',
        select: 'senderId receiverId status',
      });
    res.status(200).json(userSuggestions);
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getRegDataById = async (req, res) => {
  try {
    const userId = req.params.userId;
    const regData = await User.findById(userId, { password: 0 });
    if (!regData) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(regData);
  } catch (error) {
    console.error('Error fetching registration data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

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

    res.json({ message: 'Friend request sent successfully.', friendRequestStatus: 'Requested' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// const getFriendRequests = async (req, res) => {
//   try {
//     const accessToken = req.headers.authorization.split(' ')[1];
//     const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

//     const user = await User.findById(userData.userId).populate({
//       path: 'friendRequests',
//       populate: {
//         path: 'senderId',
//         select: 'name',
//       },
//     }).populate({
//       path: 'friendRequests',
//       populate: {
//         path: 'friendRequestId',
//         select: 'senderId receiverId status',
//       },
//     });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     const filteredFriendRequests = user.friendRequests
//       .filter(request => 
//         !request.senderId._id.equals(userData.userId) && 
//         request.friendRequestId.status !== 'Accepted' // Filter out accepted friend requests
//       )
//       .map((request) => ({
//         _id: request.senderId._id,
//         senderName: request.senderId.name,
//         receiverId: request.friendRequestId,
//         objectId: request._id,
//         status: request?.friendRequestId?.status,
//         createdAt: request.createdAt,
//       }));

//     res.json(filteredFriendRequests);
//   } catch (error) {
//     console.error('Error fetching friend requests:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

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
              $match: { 'friendRequestsInfo.status': { $ne: 'Accepted' } },
            },
            {
              $project: {
                _id: '$friendRequestsInfo.senderId',
                senderName: '$senderInfo.name',
                receiverId: '$friendRequestsInfo.friendRequestId',
                objectId: '$friendRequestsInfo._id',
                status: '$friendRequestsInfo.status',
                createdAt: '$friendRequestsInfo.createdAt',
              },
            },
            {
              $sort: { createdAt: -1 },
            },
          ],
        },
      },
    ]);
    res.json(filteredFriendRequests);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getFriends = async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(' ')[1];
    const userData = verifyAndDecodeAccessToken(accessToken, jwtSecret);

    const user = await User.findById(userData.userId).populate({
      path: 'friendsList',
      select: 'name', // Assuming your User model has a 'name' field
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const friends = user.friendsList.map(friendId => ({
      _id: friendId._id,
      name: friendId.name,
    }));

    res.json(friends);
  } catch (error) {
    console.error('Error fetching friends:', error);
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
//     console.error('Error fetching friends:', error);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

const processFriendRequest = async (req, res) => {
  try {
    const { senderId, action } = req.params;

    const friendRequest = await FriendRequest.findOne({ senderId });

    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (action === 'Accepted') {
      friendRequest.status = 'Accepted';
      await friendRequest.save();

      // Add senderId to receiver's friendsList and vice versa
      await User.findByIdAndUpdate(friendRequest.senderId, {
        $addToSet: { friendsList: friendRequest.receiverId },
      });

      await User.findByIdAndUpdate(friendRequest.receiverId, {
        $addToSet: { friendsList: friendRequest.senderId },
      });

      // Remove friend request from sender's and receiver's friendRequests list
      await User.findByIdAndUpdate(friendRequest.senderId, {
        $pull: { friendRequests: { _id: friendRequest._id } },
      });

      await User.findByIdAndUpdate(friendRequest.receiverId, {
        $pull: { friendRequests: { _id: friendRequest._id } },
      });

      res.json({ message: 'Friend request accepted successfully.' });
    } else if (action === 'Rejected') {
      friendRequest.status = 'Rejected';
      await friendRequest.save();

      // Remove friend request from sender's and receiver's friendRequests list
      await User.findByIdAndUpdate(friendRequest.senderId, {
        $pull: { friendRequests: { _id: friendRequest._id } },
      });

      await User.findByIdAndUpdate(friendRequest.receiverId, {
        $pull: { friendRequests: { _id: friendRequest._id } },
      });

      res.json({ message: 'Friend request rejected successfully.' });
    } else {
      return res.status(400).json({ message: 'Invalid action parameter.' });
    }
  } catch (error) {
    console.error('Error processing friend request:', error);
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
    console.error('Error disconnecting friend:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const generateUniquePasswordToken = (user) => {
  const token = jwt.sign({ email: user.email }, jwtSecret, { expiresIn: '1h' });
  return token;
};

const sendPasswordResetEmail = (email, token) => {
  console.log("token", token)
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
    console.error('Forgot Password Error:', error);
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
    console.error('Password Reset Error:', error);
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
    console.error('Password Requirements Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};


module.exports = {
  register,
  login,
  getRegData,
  getRegDataById,
  sendFriendRequest,
  processFriendRequest,
  disconnectFriend,
  // acceptFriendRequest,
  // rejectFriendRequest,
  forgetPassword,
  resetPassword,
  passwordNeeds,
  getFriendRequests,
  getFriends,
  // createTemplate
};