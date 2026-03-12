const firebaseTaskService = require('../services/firebaseTaskService');
const firebaseBinService = require('../services/firebaseBinService');
const firebaseUserService = require('../services/firebaseUserService');
const firebaseMessageService = require('../services/firebaseMessageService');
const { generateId } = require('../utils/generateId');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private/Admin
exports.getAllTasks = async (req, res) => {
  try {
    const { status, assignedTo, priority } = req.query;
    
    const options = {};
    if (status) options.status = status;
    if (assignedTo) options.assignedTo = assignedTo;
    if (priority) options.priority = priority;

    const tasks = await firebaseTaskService.getAllTasks(options);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get tasks for current collector
// @route   GET /api/tasks/my-tasks
// @access  Private/Collector
exports.getMyTasks = async (req, res) => {
  try {
    const { status } = req.query;

    const tasks = await firebaseTaskService.getTasksByUser(req.user.id, status);

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await firebaseTaskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is authorized
    if (req.user.role !== 'admin' && task.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private/Admin
exports.createTask = async (req, res) => {
  try {
    const { binId, assignedTo, priority, instructions, estimatedDuration } = req.body;

    // Get bin details
    const bin = await firebaseBinService.getBinById(binId);
    if (!bin) {
      return res.status(404).json({
        success: false,
        message: 'Bin not found',
      });
    }

    // Get collector details
    const collector = await firebaseUserService.getUserById(assignedTo);
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    // Generate auto-incrementing task ID (e.g., TASK-001, TASK-002)
    const taskId = await firebaseTaskService.generateTaskId();

    const taskData = {
      taskId,
      binId,
      binName: bin.name,
      binLocation: bin.location,
      assignedTo,
      assignedByName: req.user.name || 'Admin',
      priority: priority || 'medium',
      instructions: instructions || '',
      estimatedDuration: estimatedDuration || 30,
    };

    const task = await firebaseTaskService.createTask(taskData);

    // Create notification message for collector
    try {
      await firebaseMessageService.createMessage({
        messageId: `MSG_${generateId()}`,
        sender: 'admin',
        senderId: req.user.id,
        senderName: req.user.name || 'Administrator',
        recipient: 'collector',
        recipientId: assignedTo,
        recipientName: collector.name,
        messageType: 'notification',
        content: `New task assigned: ${task.taskId} - ${bin.name}`,
        relatedTaskId: task.id,
        relatedBinId: binId,
      });
    } catch (msgError) {
      console.error('Error creating notification message:', msgError);
    }

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private/Admin
exports.updateTask = async (req, res) => {
  try {
    const task = await firebaseTaskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    const updatedTask = await firebaseTaskService.updateTask(req.params.id, req.body);

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private/Admin
exports.deleteTask = async (req, res) => {
  try {
    const task = await firebaseTaskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    await firebaseTaskService.deleteTask(req.params.id);

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

// @desc    Start task (collector)
// @route   POST /api/tasks/:id/start
// @access  Private/Collector
exports.startTask = async (req, res) => {
  try {
    const task = await firebaseTaskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if task is assigned to current user
    if (task.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to start this task',
      });
    }

    // Check if task is already started or completed
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be started',
      });
    }

    const updatedTask = await firebaseTaskService.startTask(req.params.id, req.user.name);

    res.status(200).json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Complete task (collector)
// @route   POST /api/tasks/:id/complete
// @access  Private/Collector
exports.completeTask = async (req, res) => {
  try {
    const { notes, issueReported } = req.body;
    const task = await firebaseTaskService.getTaskById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if task is assigned to current user
    if (task.assignedTo !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this task',
      });
    }

    // Check if task is in progress
    if (task.status !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Task cannot be completed',
      });
    }

    const completedTask = await firebaseTaskService.completeTask(req.params.id, {
      notes,
      issueReported,
      userName: req.user.name,
    });

    // Update collector's task count
    await firebaseUserService.incrementTasksCompleted(req.user.id);

    // Create issue message for admin when collector reports an issue
    if (issueReported) {
      try {
        const issueSummary = issueReported.replace(/^ISSUE REPORT:\s*/i, '');
        const messageContent = `Task ${task.taskId} (${task.binName}): ${issueSummary}`;
        
        await firebaseMessageService.createMessage({
          messageId: `MSG_${generateId()}`,
          sender: 'collector',
          senderId: req.user.id,
          senderName: req.user.name,
          senderGsm: req.user.gsmNumber,
          recipient: 'admin',
          recipientId: 'admin',
          recipientName: 'Administrator',
          messageType: 'issue',
          content: messageContent,
          relatedTaskId: task.id,
          relatedBinId: task.binId,
        });
      } catch (messageError) {
        console.error('Error creating issue message:', messageError);
      }
    }

    // Reset bin level after completion
    try {
      await firebaseBinService.collectBin(task.binId);
    } catch (binError) {
      console.error('Error resetting bin level:', binError);
    }

    res.status(200).json({
      success: true,
      data: completedTask,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats/overview
// @access  Private/Admin
exports.getTaskStats = async (req, res) => {
  try {
    const stats = await firebaseTaskService.getTaskStats();

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

// @desc    Get collector performance
// @route   GET /api/tasks/stats/collector/:id
// @access  Private/Admin
exports.getCollectorPerformance = async (req, res) => {
  try {
    const performance = await firebaseTaskService.getCollectorPerformance(req.params.id);

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
