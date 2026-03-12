console.log("✅ binRoutes loaded from:", __filename);
// backend/routes/binRoutes.js

const express = require('express');
const router = express.Router();
const firebaseBinService = require('../services/firebaseBinService');

const {
  getAllBins,
  getBin,
  createBin,
  updateBin,
  deleteBin,
  updateBinLevel,
  getBinStats,
  collectBin,
  acknowledgeAlert,
  getBinByDeviceId,
  getBinByBinId,
} = require('../controllers/binController');

const { protect, authorize } = require('../middleware/auth');


// ===============================
// ADMIN ROUTES
// ===============================

router.route('/')
  .get(protect, authorize('admin'), getAllBins)
  .post(protect, authorize('admin'), createBin);

router.route('/stats/overview')
  .get(protect, authorize('admin'), getBinStats);

router.get('/iot/test', (req, res) => {
  res.json({ ok: true, msg: 'iot routes loaded' });
});


// ===============================
// ✅ IoT UPDATE ROUTE (ESP32)
// IMPORTANT: Must be ABOVE "/:id"
// ===============================

router.post('/iot/update', async (req, res) => {
  try {
    const {
      deviceId,
      distanceCm,
      emptyDistanceCm = 24,  // distance when bin is empty (matches ESP32 BIN_HEIGHT)
      fullDistanceCm = 0     // distance when bin is full (0 cm from sensor = full)
    } = req.body;

    if (!deviceId || distanceCm === undefined) {
      return res.status(400).json({
        success: false,
        message: 'deviceId and distanceCm are required'
      });
    }

    // Find bin by device ID using Firebase
    const bin = await firebaseBinService.getBinByDeviceId(deviceId);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found for this device'
      });
    }

    const d = Number(distanceCm);
    const emptyD = Number(emptyDistanceCm);
    const fullD = Number(fullDistanceCm);

    // Convert distance → fill percentage (same formula as ESP32)
    const levelPercent = Math.round(((emptyD - d) * 100) / emptyD);
    
    // Ensure percentage stays within 0-100 range
    const clampedLevel = Math.max(0, Math.min(100, levelPercent));

    // Update bin level using Firebase service
    const result = await firebaseBinService.updateBinLevel(bin.id, {
      deviceId,
      level: clampedLevel,
    });

    // Emit real-time update to admin dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('admin').emit('bin-update', result);
    }

    return res.json({
      success: true,
      data: {
        binId: bin.binId,
        deviceId: bin.deviceId,
        currentLevel: result.currentLevel,
        status: result.status
      }
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// ===============================
// OTHER BIN ROUTES
// ===============================

router.route('/:id')
  .get(protect, getBin)
  .put(protect, authorize('admin'), updateBin)
  .delete(protect, authorize('admin'), deleteBin);

router.route('/:id/update-level')
  .post(updateBinLevel);

router.route('/:id/collect')
  .post(protect, collectBin);

router.route('/:id/acknowledge')
  .post(protect, acknowledgeAlert);

router.get('/device/:deviceId', getBinByDeviceId);
router.get('/binid/:binId', getBinByBinId);


module.exports = router;
