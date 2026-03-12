const firebaseBinService = require('../services/firebaseBinService');
const { generateId } = require('../utils/generateId');

// @desc    Get all bins
// @route   GET /api/bins
// @access  Private/Admin
exports.getAllBins = async (req, res) => {
  try {
    const { status, area } = req.query;
    
    const options = {};
    if (status) options.status = status;
    if (area) options.area = area;

    const bins = await firebaseBinService.getAllBins(options);

    res.status(200).json({
      success: true,
      count: bins.length,
      data: bins,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single bin
// @route   GET /api/bins/:id
// @access  Private
exports.getBin = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new bin
// @route   POST /api/bins
// @access  Private/Admin
exports.createBin = async (req, res) => {
  try {
    // Generate bin ID
    const binId = `BIN_${generateId()}`;
    
    const binData = {
      ...req.body,
      binId,
    };

    const bin = await firebaseBinService.createBin(binData);

    res.status(201).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update bin
// @route   PUT /api/bins/:id
// @access  Private/Admin
exports.updateBin = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    const updatedBin = await firebaseBinService.updateBin(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: updatedBin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete bin
// @route   DELETE /api/bins/:id
// @access  Private/Admin
exports.deleteBin = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    await firebaseBinService.deleteBin(req.params.id);

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

// @desc    Update bin fill level (from ESP32)
// @route   POST /api/bins/:id/update-level
// @access  Public (with device authentication)
exports.updateBinLevel = async (req, res) => {
  try {
    const { deviceId, level } = req.body;

    const result = await firebaseBinService.updateBinLevel(req.params.id, {
      deviceId,
      level,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.message === 'Bin not found') {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }
    if (error.message === 'Unauthorized device') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized device',
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bin statistics
// @route   GET /api/bins/stats/overview
// @access  Private/Admin
exports.getBinStats = async (req, res) => {
  try {
    const stats = await firebaseBinService.getBinStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark bin as collected (reset level)
// @route   POST /api/bins/:id/collect
// @access  Private
exports.collectBin = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    const updatedBin = await firebaseBinService.collectBin(req.params.id);

    res.status(200).json({
      success: true,
      data: updatedBin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Acknowledge bin alert
// @route   POST /api/bins/:id/acknowledge
// @access  Private
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { alertIndex } = req.body;

    const bin = await firebaseBinService.getBinById(req.params.id);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    const updatedBin = await firebaseBinService.acknowledgeAlert(req.params.id, alertIndex);

    res.status(200).json({
      success: true,
      data: updatedBin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bin by device ID
// @route   GET /api/bins/device/:deviceId
// @access  Public
exports.getBinByDeviceId = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinByDeviceId(req.params.deviceId);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get bin by bin ID
// @route   GET /api/bins/binid/:binId
// @access  Private
exports.getBinByBinId = async (req, res) => {
  try {
    const bin = await firebaseBinService.getBinByBinId(req.params.binId);

    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    res.status(200).json({
      success: true,
      data: bin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
