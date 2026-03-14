const firebaseAuthService = require('../services/firebaseAuthService');
const firebaseUserService = require('../services/firebaseUserService');
const jwt = require('jsonwebtoken');

/* ===============================
   PROTECT ROUTES (AUTH CHECK)
================================ */

exports.protect = async (req, res, next) => {

  let token;

  // 1️⃣ Get token from Authorization header or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized. No token provided."
    });
  }

  try {

    let decoded;

    /* ===============================
       TRY VERIFYING CUSTOM JWT
    ================================ */

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Custom JWT verified:", decoded);
    } 
    catch (jwtError) {

      console.log("Custom JWT failed. Trying Firebase token...");

      /* ===============================
         TRY VERIFYING FIREBASE TOKEN
      ================================ */

      try {

        const { decodedToken, user } = await firebaseAuthService.verifyIdToken(token);

        if (!decodedToken || !decodedToken.uid) {
          return res.status(401).json({
            success: false,
            message: "Invalid Firebase token"
          });
        }

        req.user = {
          id: user.uid,
          uid: user.uid,
          email: user.email,
          role: user.role
        };

        return next();

      } catch (firebaseError) {

        console.error("Firebase token verification error:", firebaseError);

        return res.status(401).json({
          success: false,
          message: "Token verification failed"
        });
      }
    }

    /* ===============================
       GET USER FROM FIRESTORE
    ================================ */

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
        message: "User account disabled"
      });
    }

    /* ===============================
       ATTACH USER TO REQUEST
    ================================ */

    req.user = {
      id: user.uid,
      uid: user.uid,
      email: user.email,
      role: user.role
    };

    next();

  } catch (error) {

    console.error("Auth middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }
};


/* ===============================
   ROLE AUTHORIZATION
================================ */

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
        message: "Access denied. Insufficient permissions."
      });
    }

    next();
  };
};