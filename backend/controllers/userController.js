const firebaseUserService = require('../services/firebaseUserService');
const firebaseAuthService = require('../services/firebaseAuthService');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { role, isActive } = req.query;
    
    const options = {};
    if (role) options.role = role;
    if (isActive !== undefined) options.isActive = isActive === 'true';

    const users = await firebaseUserService.getAllUsers(options);

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = async (req, res) => {
  try {
    const { email, password, name, role, phone, gsmNumber, profilePhoto, about } = req.body;
    
    const user = await firebaseUserService.createUser({
      email,
      password,
      name,
      role,
      phone,
      gsmNumber,
      profilePhoto,
      about,
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = await firebaseUserService.updateUser(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Delete from Firestore and Firebase Auth
    await firebaseUserService.deleteUser(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get collectors
// @route   GET /api/users/collectors
// @access  Private/Admin
exports.getCollectors = async (req, res) => {
  try {
    const collectors = await firebaseUserService.getCollectors();

    res.status(200).json({
      success: true,
      count: collectors.length,
      data: collectors,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, gsmNumber, about, profilePhoto } = req.body;

    const updatedUser = await firebaseUserService.updateProfile(req.user.id, {
      name,
      phone,
      gsmNumber,
      about,
      profilePhoto,
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Change password (not available with Firebase Admin SDK)
// @route   PUT /api/users/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  try {
    // Firebase Admin SDK cannot change passwords directly
    // This would need to be handled client-side or via email reset link
    res.status(200).json({
      success: true,
      message: 'Password change is not available through the admin API. Please use the password reset feature.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Disable user
// @route   POST /api/users/:id/disable
// @access  Private/Admin
exports.disableUser = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await firebaseAuthService.disableUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User has been disabled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Enable user
// @route   POST /api/users/:id/enable
// @access  Private/Admin
exports.enableUser = async (req, res) => {
  try {
    const user = await firebaseUserService.getUserById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    await firebaseAuthService.enableUser(req.params.id);

    res.status(200).json({
      success: true,
      message: 'User has been enabled',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
