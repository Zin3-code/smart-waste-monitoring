require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const authRoutes = require('./routes/authRoutes');
const binRoutes = require('./routes/binRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(cors({
  origin: true, // Allow all origins but enable credentials
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* SERVER-SIDE ROUTE PROTECTION MIDDLEWARE */

// Middleware to check authentication for protected dashboard routes
const requireAuth = async (req, res, next) => {
  let token;

  // Check for token in Authorization header (Bearer token) OR cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    // No token found, redirect to login
    const redirectUrl = req.originalUrl === '/admin' || req.originalUrl === '/collector' 
      ? '/admin/login-test.html' 
      : '/admin/login-test.html?redirect=' + encodeURIComponent(req.originalUrl);
    return res.redirect(redirectUrl);
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token is valid, attach user to request
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    console.error('Server-side auth error:', error.message);
    // Token is invalid, redirect to login
    const redirectUrl = req.originalUrl === '/admin' || req.originalUrl === '/collector' 
      ? '/admin/login-test.html' 
      : '/admin/login-test.html?redirect=' + encodeURIComponent(req.originalUrl);
    return res.redirect(redirectUrl);
  }
};

/* PROTECTED DASHBOARD ROUTES */

// Protect admin dashboard
app.get('/admin/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

// Protect collector dashboard
app.get('/collector/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/collector/index.html'));
});

// Also protect the root /admin and /collector paths
app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/collector', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/collector/index.html'));
});

/* ADDITIONAL PROTECTED ADMIN DASHBOARD ROUTES */

// Protect debug-dashboard.html
app.get('/admin/debug-dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/debug-dashboard.html'));
});

// Protect temp-dashboard.html
app.get('/admin/temp-dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/temp-dashboard.html'));
});

// Protect debug-page.html
app.get('/admin/debug-page.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/debug-page.html'));
});

// Protect debug-nav.html
app.get('/admin/debug-nav.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/debug-nav.html'));
});

// Protect test-event-listeners.html
app.get('/admin/test-event-listeners.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/test-event-listeners.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));


/* SOCKET CONNECTION */

io.on("connection", (socket) => {

  console.log("User connected:", socket.id);

  socket.on("join", (userData) => {

    const room =
      userData.role === "admin"
        ? "admin"
        : `collector-${userData.userId}`;

    socket.join(room);

    console.log(`User joined room: ${room}`);
  });

  socket.on("bin-update", (data) => {
    io.to("admin").emit("bin-update", data);
  });

  socket.on("task-update", (data) => {

    io.to("admin").emit("task-update", data);

    if (data.collectorId) {
      io.to(`collector-${data.collectorId}`).emit("task-update", data);
    }
  });

  socket.on("new-message", (data) => {
    io.to("admin").emit("new-message", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});


/* ROOT ROUTE */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Waste Monitoring API Running"
  });
});


/* API ROUTES */

app.use("/api/auth", authRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);


/* HEALTH CHECK */

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    time: new Date()
  });
});


/* 404 HANDLER */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});


/* ERROR HANDLER */

app.use((err, req, res, next) => {

  console.error(err);

  res.status(500).json({
    success: false,
    message: err.message || "Server error"
  });

});


/* START SERVER */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", async () => {

  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Ensure admin user exists
  try {
    await ensureAdminUser();
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
  }

  // Start background process to check for stale bins every 5 minutes
  const { FirebaseBinService } = require('./services/firebaseBinService');
  setInterval(async () => {
    try {
      console.log('Running stale bin check...');
      const staleBins = await FirebaseBinService.checkAndUpdateStaleBins(5); // 5 minute threshold
      if (staleBins.length > 0) {
        console.log(`Marked ${staleBins.length} bins as offline due to inactivity`);
        // Emit socket event to notify admins of offline bins
        const io = require('./server').io;
        if (io) {
          io.to("admin").emit("stale-bins-detected", { count: staleBins.length, binIds: staleBins });
        }
      }
    } catch (error) {
      console.error('Error in stale bin check:', error);
    }
  }, 5 * 60 * 1000); // Run every 5 minutes

});

// Function to ensure admin user exists
async function ensureAdminUser() {
  try {
    console.log('🔍 Checking for admin user...');
    const firebaseUserService = require('./services/firebaseUserService');
    const bcrypt = require('bcryptjs');

    // Check if admin user exists
    const existingAdmin = await firebaseUserService.getUserByEmail('admin@gmail.com');

    if (!existingAdmin) {
      console.log('📝 Admin user not found, creating...');

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      // Create admin user
      const adminUser = await firebaseUserService.createUser({
        email: 'admin@gmail.com',
        password: hashedPassword, // This will be stored in Firestore
        name: 'Administrator',
        role: 'admin',
        phone: '+1234567890',
        gsmNumber: '+1234567890'
      });

      console.log('✅ Admin user created successfully with ID:', adminUser.uid);
    } else {
      console.log('✅ Admin user already exists with ID:', existingAdmin.uid);
    }
  } catch (error) {
    console.error('❌ Error in ensureAdminUser:', error.message);
    console.error('Stack:', error.stack);
    // Don't throw - allow server to continue
  }
}


module.exports = { app, io };