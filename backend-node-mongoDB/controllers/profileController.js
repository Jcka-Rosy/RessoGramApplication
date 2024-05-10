const Profile = require('../models/Profile');
const User = require('../models/User');

const getProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const userProfile = await Profile.findOne({ userId });
    if (!userProfile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const updatedProfileData = req.body;
    const updatedProfile = await User.findByIdAndUpdate(userId, updatedProfileData, { new: true });

    res.status(200).json(updatedProfile);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getProfile, updateProfile };