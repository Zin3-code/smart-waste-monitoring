# Quick Start Guide

This guide will help you get the Smart Waste Monitoring System up and running quickly.

## Prerequisites

Make sure you have the following installed:
- Node.js (v14 or higher)
- Python 3 (for serving static files)
- A Firebase project with Firestore and Firebase Auth enabled

## Firebase Setup

### Step 1: Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Enter your project name (e.g., "smart-waste-monitoring")
4. Disable Google Analytics (optional, for simpler setup)
5. Click "Create project"

### Step 2: Enable Firestore Database
1. In the Firebase Console, click "Build" → "Firestore Database"
2. Click "Create database"
3. Choose a location (preferably closest to your users)
4. Start in **Test mode** (read/write rules for development)
5. Click "Done"

### Step 3: Enable Firebase Authentication
1. In the Firebase Console, click "Build" → "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable **Email/Password** provider:
   - Click "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

### Step 4: Get Firebase Service Account Credentials
1. In the Firebase Console, go to Project Settings (gear icon ⚙️)
2. Click "Service accounts" tab
3. Click "Generate new private key"
4. Confirm and click "Generate key"
5. Save the downloaded JSON file (keep this secure!)

### Step 5: Configure Firebase in Backend
1. Rename the downloaded JSON file to `serviceAccountKey.json`
2. Move it to the `backend` directory
3. Create a `.env` file in the `backend` directory:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Private Key Content\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
   FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
   
   GSM_API_URL=http://localhost:3001/api/sms
   GSM_API_KEY=your-gsm-api-key
   NEAR_FULL_THRESHOLD=75
   FULL_THRESHOLD=90
   CLIENT_URL=http://localhost:3000
   ```
4. Update the Firebase configuration values with the information from your downloaded service account key.

## Step 1: Start the Backend Server
Open a new terminal and navigate to the backend directory:
```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:5000`

## Step 2: Serve the Admin Dashboard
Open a new terminal and navigate to the admin dashboard:
```bash
cd frontend/admin
python -m http.server 3000
```

The Admin Dashboard will be available at `http://localhost3000`

## Step 3: Serve the Collector Dashboard
Open a new terminal and navigate to the collector dashboard:
```bash
cd frontend/collector
python -m http.server 3001
```

The Collector Dashboard will be available at `http://localhost:3001`

## Step 4: Create an Admin User
Use curl to create the first admin user:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "admin123",
    "role": "admin",
    "phone": "+639261013245",
    "gsmNumber": "+639261013245"
  }'
```

## Step 5: Login to Admin Dashboard
1. Open your browser and go to `http://localhost:3000`
2. Enter the admin credentials:
   - Email: `admin@example.com`
   - Password: `admin123`
3. Click "Login"

## Step 6: Create a Collector User
1. In the Admin Dashboard, go to "Users" section
2. Click "Add User"
3. Fill in the collector details:
   - Name: `John Collector`
   - Email: `collector@example.com`
   - Password: `collector123`
   - Role: `Collector`
   - Phone: `+1234567891`
   - GSM Number: `+1234567891`
4. Click "Add User"

## Step 7: Add a Smart Bin
1. In the Admin Dashboard, go to "Smart Bins" section
2. Click "Add Bin"
3. Fill in the bin details:
   - Name: `Market Bin`
   - Address: `123 Main St, Cantilan`
   - Area: `Downtown`
   - Latitude: `9.1234`
   - Longitude: `125.5678`
   - GSM Number: `+1234567892`
   - Device ID: `ESP32-DEVICE-001`
4. Click "Add Bin"

## Step 8: Create a Collection Task
1. In the Admin Dashboard, go to "Tasks" section
2. Click "Create Task"
3. Select the bin and assign to the collector
4. Set priority and instructions
5. Click "Create Task"

## Step 9: Login to Collector Dashboard
1. Open a new browser tab and go to `http://localhost:3001`
2. Enter the collector credentials:
   - Email: `collector@example.com`
   - Password: `collector123`
3. Click "Login"

## Step 10: Complete a Task
1. In the Collector Dashboard, view the assigned task
2. Click "Start Task"
3. After completing the collection, click "Complete Task"
4. Add notes if needed
5. Click "Complete Task" to finish

## Testing with ESP32
To test with actual hardware:
1. Update the ESP32 configuration in `esp32-firmware/include/config.h`:
   - Set your WiFi credentials
   - Set the server host to your backend URL
   - Set the BIN_ID and DEVICE_ID to match your bin

2. Build and upload the firmware:
   ```bash
   cd esp32-firmware
   pio run --target upload
   ```

3. Monitor the serial output:
   ```bash
   pio device monitor
   ```

The ESP32 will start sending fill level updates to the server every 30 seconds.

## Troubleshooting

### Firebase Connection Error
If you see "Firebase Connection Error", check:
- The `serviceAccountKey.json` file is in the correct location (backend directory)
- The Firebase configuration in `.env` is correct
- Your Firebase project is active and services are enabled

### Port Already in Use
If port 5000 is already in use, you can change it in `backend/.env`:
```env
PORT=5001
```

### CORS Errors
If you see CORS errors, update the `CLIENT_URL` in `backend/.env` to match your frontend URL:
```env
CLIENT_URL=http://localhost:3000
```

### WiFi Connection Issues (ESP32)
If the ESP32 can't connect to WiFi:
- Check your WiFi credentials in `esp32-firmware/include/config.h`
- Make sure the ESP32 is within range of your WiFi network
- Check the serial monitor for error messages

## Next Steps
- Read the full [README.md](README.md) for detailed documentation
- Explore the API documentation
- Set up your hardware components
- Deploy to a production server

## Support
For issues or questions, please open an issue on GitHub or contact support@example.com.
