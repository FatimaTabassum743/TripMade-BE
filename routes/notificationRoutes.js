const express = require('express');
const { getNotifications, markAsRead } = require('../controllers/notificationController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', auth, getNotifications);
router.put('/:notificationId/read', auth, markAsRead);

module.exports = router; 