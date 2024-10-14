const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true},
  email: { type: String},
  id: { type: String, unique: true, required: true },
  phone: { type: String},
  bio: { type: String },
  role: { type: String, enum: ['admin', 'buyer', 'seller'], default: 'buyer' },
  registerMethod: { type: String, enum: ['email', 'phone', 'google'], default: 'email' },
  status: { type: String, default: "active" },
  profilePic: { type: String },
  dateJoined: { type: Date, default: Date.now },
  paymentMethod: { type: String },
  paymentAcc: { type: String },
  dateOfBirth: { type: Date },
  country: { type: String },
  points: { type: Number, default: 0 },
  gender: { type: String },
  rating:{type: Number, default: 0}
}, { timestamps: true });



const User = mongoose.model('User', userSchema);

module.exports = User;
