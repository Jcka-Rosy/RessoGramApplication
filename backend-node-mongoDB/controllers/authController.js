const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
// const EmailTemplate = require('../models/emailtemplate');
const User = require('../models/User');
const jwtSecret = "happy-faces";

function generateJWTToken(user) {
  const token = jwt.sign({ userId: user._id, email: user.email}, jwtSecret, { expiresIn: '11h' });
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

    const newUser = new User({...req.body, name, email, password: hashedPassword });
    await newUser.save();


    res.status(200).json({...req.body, userId: newUser._id, name: newUser.name , email: newUser.email});
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

const getRegData = async (req, res)=>{
  try {
    const accessToken = req.headers.authorization.split(' ')[1]
    const user = verifyAndDecodeAccessToken(accessToken, jwtSecret);
    if (!user) {
      return res.status(401).json({ code: 401, status: false, message: 'Unauthorized' });
    }
    const existingUser = await User.findOne({ _id: user.userId });
    if (!existingUser) {
      return res.status(404).json({ code: 404, status: false, message: 'User not found' });
    }
    const userSuggestions = await User.find({ _id: { $ne: user.userId } })
    .limit(5);
    res.status(200).json(userSuggestions);
  } catch (error) {
    console.error('Error fetching user suggestions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const getRegDataById = async (req, res)=>{
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
  // try {
  //   const { userId } = req.params;
  //   const senderId = req.user.userId; // Assuming you have middleware to extract userId from JWT

  //   // Check if the request already exists
  //   const existingRequest = await FriendRequest.findOne({ senderId, receiverId: userId });
  //   if (existingRequest) {
  //     return res.status(400).json({ message: 'Friend request already sent' });
  //   }

  //   // Create a new friend request
  //   const newFriendRequest = new FriendRequest({ senderId, receiverId: userId });
  //   await newFriendRequest.save();

  //   res.status(201).json(newFriendRequest);
  // } catch (error) {
  //   console.error(error);
  //   res.status(500).json({ message: 'Internal server error' });
  // }
  const { userId } = req.params;
  // const { currentUserId } = req.user; // Assuming you have user authentication middleware

  try {
    const accessToken = req.headers.authorization.split(' ')[1]
    console.log("accessToken",req.headers, "traytawfsds", accessToken)
    const currentUserId = verifyAndDecodeAccessToken(accessToken, jwtSecret);
    console.log("user--->",currentUserId)
    if (!currentUserId) {
      return res.status(401).json({ code: 401, status: false, message: 'Unauthorized' });
    }
    // Check if the user is sending a friend request to themselves
    if (userId === currentUserId.userId.toString()) {
      return res.status(400).json({ message: "You can't send a friend request to yourself." });
    }

    // Check if the user is already friends or has sent a friend request
    const currentUser = await User.findById(currentUserId);
    if (
      currentUser.friends.includes(userId) ||
      currentUser.friendRequests.includes(userId)
    ) {
      return res.status(400).json({ message: 'Friend request already sent or they are already your friend.' });
    }

    // Add the friend request to the recipient's friendRequests array
    await User.findByIdAndUpdate(userId, { $addToSet: { friendRequests: currentUserId } });
    const friendRequest = new FriendRequest({
      senderId: currentUserId.userId,
      receiverId: userId,
      status: 'Pending',
    });
    
    // Save the friend request
    friendRequest.save();
    res.json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error.' });
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
     console.log("newPassword", newPassword, "token", token)

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

// Endpoint to fetch password requirements
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
  forgetPassword,
  resetPassword,
  passwordNeeds
  // createTemplate
};