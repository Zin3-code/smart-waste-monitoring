const firebaseUserService = require('../services/firebaseUserService');
const { generateId } = require('../utils/generateId');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, gsmNumber } = req.body;

    // Check if user already exists in Firestore
    const existingUser = await firebaseUserService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Create user in Firebase Auth and Firestore
    const user = await firebaseUserService.createUser({
      email,
      password,
      name,
      role,
      phone,
      gsmNumber,
    });

    // Generate custom token for the user
    const token = await firebaseAuthService.createCustomToken(user.uid);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gsmNumber: user.gsmNumber,
        profilePhoto: user.profilePhoto,
        about: user.about,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email',
      });
    }

    // Get user from Firestore
    const user = await firebaseUserService.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Update last active
    await firebaseUserService.updateLastActive(user.uid);

    // Generate JWT token
    const token = jwt.sign(
      { 
        uid: user.uid, 
        role: user.role, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Set HTTP-only cookie with token
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gsmNumber: user.gsmNumber,
        profilePhoto: user.profilePhoto,
        about: user.about,
        tasksCompleted: user.tasksCompleted,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gsmNumber: user.gsmNumber,
        tasksCompleted: user.tasksCompleted,
        lastActive: user.lastActive,
        profilePhoto: user.profilePhoto,
        about: user.about,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Verify token
// @route   POST /api/auth/verify
// @access  Private
exports.verifyToken = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.uid,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        gsmNumber: user.gsmNumber,
        tasksCompleted: user.tasksCompleted,
        lastActive: user.lastActive,
        profilePhoto: user.profilePhoto,
        about: user.about,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
