const User = require('../models/User');
const OtpModel = require('../models/OtpModel');
const { admin } = require('../firebase/firebaseAdmin');
const nodemailer = require('nodemailer');
const OTP_EXPIRATION = 10 * 60 * 1000;


exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, sortField = 'id', sortOrder = 'asc', search = '', searchField = '' } = req.query;

    const query = {};

    // Dynamically construct the search query based on searchField or default to name and email
    if (searchField && search) {
      query[searchField] = { $regex: search, $options: 'i' };
    } else if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const limit = 40;
    const users = await User.find(query)
      .sort({ [sortField]: sortOrder === 'asc' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const totalUsers = await User.countDocuments(query);

    res.status(200).json({
      users,
      totalUsers,
      limit,
      page: parseInt(page),
      hasNextPage: page * limit < totalUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserCount = async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error fetching user count:', error);
    res.status(500).json({ message: 'Failed to fetch user count' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user from Firebase Auth
    await admin.auth().deleteUser(user.id);

    // Delete user from MongoDB
    await User.findByIdAndDelete(user._id)

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user', error });
    console.log(error);
  }
};

exports.disableUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'disabled';

    await user.save();

    res.status(200).json({ message: 'User disabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error disabling user', error });
  }
};

exports.enableUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = 'active';
    await user.save();

    res.status(200).json({ message: 'User enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error enabling user', error });
  }
};


exports.signUpWithEmail = async (req, res) => {
  const { email, otp, name, password } = req.body;

  const profilePic = 'https://cdn-icons-png.flaticon.com/512/1361/1361913.png';

  try {
    // Find the stored OTP for the given email
    const otpRecord = await OtpModel.findOne({ email });

    if (!otpRecord || otpRecord.otp !== otp || Date.now() > otpRecord.expiration) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    // OTP is valid, proceed to create user
    const { nanoid } = await import('nanoid');
    const userId = nanoid(6);

    const newUser = new User({
      name,
      id: userId,
      email,
      role: 'buyer',
      profilePic,
      registerMethod: 'email'
    });

    await newUser.save();

    try {
      // Create user in Firebase Authentication
      const firebaseUser = await admin.auth().createUser({
        uid: userId, // Ensure the same ID is used in Firebase
        email,
        password,
        displayName: name,
        photoURL: profilePic,
      });

      res.status(201).json({ message: 'User created successfully', user: newUser });
    } catch (error) {
      // Rollback: Delete the user from MongoDB if Firebase creation fails
      await User.findOneAndDelete({ id: userId });

      res.status(500).json({ message: 'Error creating user', error });
    }

  } catch (error) {
    console.log(error);
    
    res.status(500).json({ message: 'Error during sign-up process.', error });
  }
};


exports.signInWithEmail = async (req, res) => {
  const { email } = req.body;

  try {

    // Find user in MongoDB
    const user = await User.findOne({ email });

    if (!user) {

      return res.status(404).json({
        error: "Sign In Failed. User not registered.",
        status: 404,
        message: 'User not found in database'
      });

    }

    if (user.registerMethod != 'email') {

      return res.status(400).json({
        error: "Sign In Failed",
        status: 400,
        message: `User registered with ${user.registerMethod.toUpperCase()}`
      });

    }
    

    res.status(200).json({
      message: 'User signed in successfully',
      status: 200,
      user,
    });

  } catch (error) {
    console.error('Error signing in:', error);
    res.status(500).json({ message: 'Failed to sign in', error });
  }
};


exports.signUpWithPhone = async (req, res) => {
  const { token, name, password } = req.body; // Token from frontend after OTP verification

  const profilePic = 'https://cdn-icons-png.flaticon.com/512/1361/1361913.png';

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, phone_number } = decodedToken;

    // Check if user already exists in MongoDB
    let user = await User.findOne({ id: uid });
    if (!user) {
      // Create new user in MongoDB
      user = new User({
        id: uid,
        name: name,
        password: password,
        profilePic: profilePic,
        phone: phone_number,
        role: 'buyer',
        registerMethod: 'phone'
      });

      await user.save();

      res.status(201).json({
        message: 'Phone authentication successful',
        user,
      });
    } else {

      res.status(201).json({
        message: 'User already exists!',
      });

    }
  } catch (error) {
    console.error('Error with phone sign-up:', error);
    res.status(500).json({ message: 'Failed to sign up with phone', error });
  }
};


exports.signInWithGoogle = async (req, res) => {
  const { token } = req.body; // Token received from frontend Google sign-in

  try {
    // Verify Firebase ID Token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { uid, email, name, picture } = decodedToken;

    const emailUser = await User.findOne({email});

    if (emailUser) {

      return res.status(400).json({
        error: "Sign In Failed",
        status: 400,
        message: `User already registered with ${emailUser.registerMethod}. Please try with ${emailUser.registerMethod} login.`
      });

    }

    // Check if user already exists in MongoDB
    let user = await User.findOne({ id: uid });

    if (!user) {
      // Create new user in MongoDB
      user = new User({
        id: uid,
        email,
        name,
        profilePic: picture,
        role: 'buyer',
        registerMethod: 'google'
      });

      await user.save();

      res.status(200).json({
        message: 'User signed up successfully',
        user,
      });

    } else {

      res.status(200).json({
        message: 'Google sign-in successful',
      });

    }


  } catch (error) {
    console.error('Error with Google sign-in:', error);
    res.status(500).json({ message: 'Failed to sign in with Google', error });
  }
};


exports.sendOtpToEmail = async (req, res) => {
  const { email, name } = req.body;

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);


  try {
    // Save OTP and its expiration in the user's document (or create a new temp document if user doesn't exist yet)
    const otpExpiration = Date.now() + OTP_EXPIRATION;

    await OtpModel.findOneAndUpdate(
      { email: email },
      {
        otp: otp,
        expiration: otpExpiration,
        isVerified: false, // Reset verification status on new OTP
      },
      { upsert: true } // Create a new document if it doesn't exist
    );

    // Send OTP via email using nodemailer
    const transporter = nodemailer.createTransport({
      host: "mail.sparknetco.com",  // SMTP server for your domain
      port: 465,                    // Secure SMTP port for SSL/TLS
      secure: true,                 // Use SSL/TLS (since port 465 is used)
      auth: {
        user: "samit@sparknetco.com",  // Your email
        pass: "IloveAllahTheMostHigh",   // Email password
      },
    });



    const htmlTemplate = `
    
    <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Template</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
  </head>
  <body>
      <div style="font-family: 'Roboto', sans-serif; background: rgb(255, 251, 234); border-radius: 10px; padding: 20px 0px 0px 0px; margin: 10px;">
          <div style="border-bottom: 1px solid rgb(200, 200, 200); padding-bottom: 20px; padding-top: 10px;">
              <img src="https://cdn-icons-png.freepik.com/512/3779/3779800.png" alt="Bite Bazaar Logo" width="80px" style="display: block; margin: auto;">
          </div>
          <div style="padding: 0px 15px;">
              <h3 style="font-size: 24px;">Hello, ${name}</h3>
              <h3 style="font-size: 24px;">Verify Your Email Address</h3>
              <p style="font-size: 18px;">You need to verify your email address to complete the signup process. Enter the following code to verify your email address:</p>
              <h2 style="font-size: 35px; text-align: center; color: red;"><span style="background: rgb(255, 236, 202); padding: 10px; border-radius: 10px;">${otp}</span></h2>
          </div>
          <div style="height: 1px; background: rgb(200, 200, 200);"></div>
          <div style="padding: 0px 15px;">
              <p style="font-size: 18px;">
                The verification code will be valid for 10 minutes. Please keep this code confidential and do not share it with anyone.<br><br>
                This is an automated message, please do not reply.<br><br>
                <span style="color: rgb(171, 0, 0);">If you didn't request this code, you can ignore this message.</span>
              </p>
              <br>
              <p style="font-size: 18px; color: rgb(93, 93, 255);">For assistance, contact us at: <a href="https://bitebazaar.com.bd" target="_blank" style="color: rgb(215, 215, 0);"><span>https://bitebazaar.com.bd</span></a></p>
          </div>
          <div style="border-top: 2px solid; padding: 5px 0; background: rgba(255, 255, 0, 0.641); border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
              <p style="text-align: center; color: rgb(81, 81, 81); font-size: 20px;">Bite Bazaar</p>
          </div>
      </div>
  </body>
  </html>
  
  `;

    const mailOptions = {
      from: '"Bite Bazaar" <samit@sparknetco.com>', // sender address
      to: email, // receiver address
      subject: "Verify Your Email Address", // Subject line
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      }
    });

    res.status(200).json({ message: 'OTP sent to email' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP.', error });
  }
};


exports.getUserByEmail = async (req, res) => {
  const { email } = req.params; // Assuming email is passed in the URL as a parameter

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If user is found, send the user data
    res.status(200).json(user);
  } catch (error) {
    // Handle errors during the query
    res.status(500).json({ message: 'Error finding user', error });
  }
};
