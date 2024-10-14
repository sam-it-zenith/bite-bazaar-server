const mongoose = require('mongoose');
const dotenv = require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE);
    console.log(' DB Connected Successfully! '.bgBlue.white.bold);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
