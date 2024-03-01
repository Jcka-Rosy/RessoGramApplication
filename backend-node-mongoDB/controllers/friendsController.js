
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

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

    res.json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Implement acceptFriendRequest, rejectFriendRequest, getFriendsList, and disconnectFriend controllers similarly

// module.exports = { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getFriendsList, disconnectFriend };
module.exports = { sendFriendRequest};
