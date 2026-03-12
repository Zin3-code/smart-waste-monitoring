# Running the Smart Waste Monitoring System

This guide shows how to run the local development stack (backend API + dashboards) and optionally the ESP32 firmware.

## Prerequisites
- Node.js (v14+)
- Firebase project with Firestore and Firebase Auth enabled
- Python 3 (for serving the static dashboards) or `npx http-server`
- Optional: PlatformIO (for ESP32 firmware)

## Firebase Setup

### 1) Create and Configure Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use an existing one)
3. Enable Firestore Database (start in Test mode for development)
4. Enable Firebase Authentication with Email/Password sign-in
5. Generate a service account key (JSON file) from Project Settings → Service accounts
6. Save the JSON file as `serviceAccountKey.json` in the `backend` directory

### 2) Configure Environment Variables
Create a `backend/.env` file with the following:
```env
PORT=5000
NODE_ENV=development

# Firebase Configuration (from serviceAccountKey.json)
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

## 1) Start the backend API
```bash
cd backend
npm install
npm run dev
```

The backend listens on `http://localhost:5000`.

If you need to change ports or other settings, edit `backend/.env`.

## 2) Serve the Admin dashboard
```powershell
cd frontend/admin
python -m http.server 3000
```

Admin dashboard: `http://localhost:3000`

## 3) Serve the Collector dashboard
Open a **new terminal** so both dashboards can run at the same time, then:
```powershell
cd frontend/collector
python -m http.server 3001
```

Collector dashboard: `http://localhost:3001`

Note: If both `http://localhost:3000/` and `http://localhost:3001/` show the **admin** site, you likely started the second server from the wrong folder. Make sure the collector server is started from `frontend\collector` (not `frontend\admin`).

## 4) First-time setup (users, bins, tasks)

Create the initial admin user:
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

Then in the Admin dashboard:
- Create a Collector user.
- Add at least one Smart Bin.
- Create a Task and assign it to the Collector.

Finally, log in to the Collector dashboard with the collector account.

## 5) Optional: ESP32 firmware
1. Update `esp32-firmware/include/config.h` with WiFi credentials, backend host, `BIN_ID`, and `DEVICE_ID`.
2. Build and upload:
```bash
cd esp32-firmware
pio run --target upload
```
3. Monitor serial output:
```bash
pio device monitor
```

## Notes and troubleshooting
- If port 5000 is already in use, change `PORT` in `backend/.env` and update the `API_BASE_URL` in `frontend/admin/app.js` and `frontend/collector/app.js`.
- Socket.io origin is limited by `CLIENT_URL` in `backend/.env`. If realtime updates do not connect from a dashboard, set `CLIENT_URL` to that dashboard URL or update the server to allow both origins.
- If you see Firebase connection errors, check:
  - The `serviceAccountKey.json` file exists and is valid
  - Firebase project configuration in `.env` is correct
  - Firestore and Firebase Auth services are enabled
  - Your network connection is working
