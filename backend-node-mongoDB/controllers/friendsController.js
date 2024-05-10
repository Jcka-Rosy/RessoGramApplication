
const User = require('../models/User');

const sendFriendRequest = async (req, res) => {
  const { userId } = req.params;

  try {
    const accessToken = req.headers.authorization.split(' ')[1]
    const currentUserId = verifyAndDecodeAccessToken(accessToken, jwtSecret);
    if (!currentUserId) {
      return res.status(401).json({ code: 401, status: false, message: 'Unauthorized' });
    }
    if (userId === currentUserId.userId.toString()) {
      return res.status(400).json({ message: "You can't send a friend request to yourself." });
    }

    const currentUser = await User.findById(currentUserId);
    if (
      currentUser.friends.includes(userId) ||
      currentUser.friendRequests.includes(userId)
    ) {
      return res.status(400).json({ message: 'Friend request already sent or they are already your friend.' });
    }

    await User.findByIdAndUpdate(userId, { $addToSet: { friendRequests: currentUserId } });
    res.json({ message: 'Friend request sent successfully.' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

module.exports = { sendFriendRequest };
