const firebaseAuthService = require('../services/firebaseAuthService');
const firebaseUserService = require('../services/firebaseUserService');
const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {

  let token;

  // Check Authorization header OR cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized"
    });
  }

  try {

    let decoded;

    // Try custom JWT first
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Successfully verified custom JWT:", decoded);
    }
    catch (jwtError) {
      console.error("JWT verification error:", jwtError);

      // Try Firebase token
      try {
        const { decodedToken, user } = await firebaseAuthService.verifyIdToken(token);
        console.log("Successfully verified Firebase token:", decodedToken);

        if (!decodedToken || !decodedToken.uid) {
          return res.status(401).json({
            success: false,
            message: "Invalid Firebase token"
          });
        }

        req.user = user;

        return next();
      } catch (firebaseError) {
        console.error("Firebase token verification error:", firebaseError);
        return res.status(401).json({
          success: false,
          message: "Token verification failed"
        });
      }
    }

    // Extract UID safely
    const uid = decoded.uid || decoded.id || decoded.userId;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Invalid token: UID missing"
      });
    }

    const user = await firebaseUserService.getUserById(uid);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: "User disabled"
      });
    }

    req.user = {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      role: user.role
    };

    next();

  }
  catch (error) {

    console.error("Auth middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
};


exports.authorize = (...roles) => {

  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    next();
  };

};