const mongoose = require('mongoose');

const profileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    unique: true,
    required: true,
  },
  name: {
    type: String,
  },
  gender: {
    type: String,
    enum: ['Male', 'Female'],
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  knownLanguages: {
    type: [String],
  },
  knownTechnologies: {
    type: [String],
  },
});

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;