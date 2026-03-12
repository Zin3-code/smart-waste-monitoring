const firebaseUserService = require('../services/firebaseUserService');
const jwt = require('jsonwebtoken');

// ================= REGISTER =================
// @desc Register a new user
// @route POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, gsmNumber } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    // Check if user already exists
    const existingUser = await firebaseUserService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists"
      });
    }

    // Create user in Firebase
    const user = await firebaseUserService.createUser({
      name,
      email,
      password,
      role,
      phone,
      gsmNumber
    });

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user
    });

  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ================= LOGIN =================
// @desc Login user
// @route POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide email"
      });
    }

    // Get user from Firestore
    const user = await firebaseUserService.getUserByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    // Update last active
    await firebaseUserService.updateLastActive(user.uid);

    // Generate JWT
    const token = jwt.sign(
      {
        uid: user.uid,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ================= GET CURRENT USER =================
// @route GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// ================= VERIFY TOKEN =================
// @route POST /api/auth/verify
exports.verifyToken = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.status(200).json({
      success: true,
      user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};