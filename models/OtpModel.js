const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true, // OTPs are stored per email, so we ensure uniqueness
    },
    otp: {
        type: String,
        required: true,
    },
    expiration: {
        type: Date,
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    }
});

// Export the model
const OtpModel = mongoose.model('Otp', otpSchema);
module.exports = OtpModel;
