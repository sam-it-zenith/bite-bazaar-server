const express = require('express');
const userController = require('../controllers/user.controller');
// const { verifyToken, isAdminOrModerator } = require('../middlewares/auth');

const router = express.Router();

// Route to create a new user

router.get('/', userController.getAllUsers);
router.get('/count', userController.getUserCount);
router.get('/:email', userController.getUserByEmail);
router.delete('/:id', userController.deleteUser);
router.patch('/:id/disable', userController.disableUser);
router.patch('/:id/enable', userController.enableUser);

router.post('/signup-with-email', userController.signUpWithEmail);
router.post('/signin-with-email', userController.signInWithEmail);
router.post('/signin-with-google', userController.signInWithGoogle);
router.post('/signup-with-phone', userController.signUpWithPhone);

router.post('/send-email-otp', userController.sendOtpToEmail);



module.exports = router;
