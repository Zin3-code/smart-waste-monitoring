require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const binRoutes = require('./routes/binRoutes');
const taskRoutes = require('./routes/taskRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set("io", io);

app.use(cors({
  origin: true, 
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* SERVER-SIDE ROUTE PROTECTION MIDDLEWARE */

const requireAuth = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    const redirectUrl = req.originalUrl === '/admin' || req.originalUrl === '/collector' 
      ? '/admin/login-test.html' 
      : '/admin/login-test.html?redirect=' + encodeURIComponent(req.originalUrl);
    return res.redirect(redirectUrl);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.uid,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    console.error('Server-side auth error:', error.message);
    const redirectUrl = req.originalUrl === '/admin' || req.originalUrl === '/collector' 
      ? '/admin/login-test.html' 
      : '/admin/login-test.html?redirect=' + encodeURIComponent(req.originalUrl);
    return res.redirect(redirectUrl);
  }
};

/* PROTECTED DASHBOARD ROUTES */

app.get('/admin/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/collector/index.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/collector/index.html'));
});

app.get('/admin', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/index.html'));
});

app.get('/collector', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/collector/index.html'));
});

/* ADDITIONAL PROTECTED ADMIN DASHBOARD ROUTES */

app.get('/admin/debug-dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/debug-dashboard.html'));
});

app.get('/admin/temp-dashboard.html', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin/temp-dashboard.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

/* SOCKET CONNECTION */

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (userData) => {
    const room = userData.role === "admin" ? "admin" : `collector-${userData.userId}`;
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  socket.on("bin-update", (data) => {
    io.to("admin").emit("bin-update", data);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

/* API ROUTES */

app.get("/", (req, res) => {
  res.json({ success: true, message: "Smart Waste Monitoring API Running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/bins", binRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

/* START SERVER */

const PORT = process.env.PORT || 5000;

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

  try {
    await ensureAdminUser();
  } catch (error) {
    console.error('Error ensuring admin user exists:', error);
  }

  // FIXED: Correctly importing the Service class without curly braces
  const FirebaseBinService = require('./services/firebaseBinService');

  setInterval(async () => {
    try {
      console.log('Running stale bin check...');
      // Threshold set to 5 minutes
      const staleBins = await FirebaseBinService.checkAndUpdateStaleBins(5); 
      
      if (staleBins && staleBins.length > 0) {
        console.log(`Marked ${staleBins.length} bins as offline`);
        
        // FIXED: Using the 'io' variable defined at the top of the file
        if (io) {
          io.to("admin").emit("stale-bins-detected", { 
            count: staleBins.length, 
            binIds: staleBins 
          });
        }
      }
    } catch (error) {
      console.error('Error in stale bin check:', error);
    }
  }, 5 * 60 * 1000); 
});

// Helper Function for Admin Creation
async function ensureAdminUser() {
  try {
    console.log('🔍 Checking for admin user...');
    const firebaseUserService = require('./services/firebaseUserService');
    const bcrypt = require('bcryptjs');

    const existingAdmin = await firebaseUserService.getUserByEmail('admin@gmail.com');

    if (!existingAdmin) {
      console.log('📝 Admin user not found, creating...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);

      const adminUser = await firebaseUserService.createUser({
        email: 'admin@gmail.com',
        password: hashedPassword,
        name: 'Administrator',
        role: 'admin',
        phone: '+1234567890',
        gsmNumber: '+1234567890'
      });
      console.log('✅ Admin user created:', adminUser.uid);
    } else {
      console.log('✅ Admin user already exists:', existingAdmin.uid);
    }
  } catch (error) {
    console.error('❌ Error in ensureAdminUser:', error.message);
  }
}

module.exports = { app, io };