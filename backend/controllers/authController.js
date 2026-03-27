const firebaseUserService = require('../services/firebaseUserService');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');

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
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt for email: ${email}`);

    if (!email || !password) {
      console.log("[AUTH] Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Please provide email and password"
      });
    }

    // Get user from Firestore
    const user = await firebaseUserService.getUserByEmail(email);
    console.log(`[AUTH] User lookup result: ${user ? 'Found' : 'Not found'}`);

    if (!user) {
      console.log("[AUTH] User not found");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    console.log(`[AUTH] User data: id=${user.uid}, email=${user.email}, role=${user.role}, isActive=${user.isActive}, hasPassword=${!!user.password}`);

    if (user.isActive === false) {
      console.log("[AUTH] Account is deactivated");
      return res.status(401).json({
        success: false,
        message: "Account is deactivated"
      });
    }

    // Validate password
    let isPasswordValid = false;

    // Check if user has a password field (legacy users)
    if (user.password) {
      console.log("[AUTH] Comparing password with bcrypt");
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // For Firebase users without passwords, allow login with default password
      // This is temporary - in production, users should reset their passwords
      console.log("[AUTH] Using default password check");
      isPasswordValid = password === 'password123';
    }

    console.log(`[AUTH] Password validation result: ${isPasswordValid}`);

    if (!isPasswordValid) {
      console.log("[AUTH] Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Update last active
    console.log("[AUTH] Updating last active");
    await firebaseUserService.updateLastActive(user.uid);

    // Generate JWT
    console.log("[AUTH] Generating JWT token");
    const token = jwt.sign(
      {
        uid: user.uid,
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    console.log("[AUTH] Login successful");
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.uid,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("[AUTH] Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed"
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