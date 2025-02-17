const db = require('../models/Notification');

exports.createNotification = async (userId, message, city) => {
  try {
    const [result] = await db.query(
      'INSERT INTO notifications (user_id, message, city, created_at) VALUES (?, ?, ?, NOW())',
      [userId, message, city]
    );
    return result.insertId;
  } catch (err) {
    console.error('Error creating notification:', err);
    throw err;
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? AND is_read = FALSE ORDER BY created_at DESC',
      [req.user.id]
    );
    
    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      message: notification.message,
      city: notification.city,
      createdAt: notification.created_at,
      isRead: notification.is_read
    }));

    res.json(formattedNotifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Error fetching notifications' });
  }
};

exports.markAsRead = async (req, res) => {
  const { notificationId } = req.params;
  try {
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Error updating notification' });
  }
}; 