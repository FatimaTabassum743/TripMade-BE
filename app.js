const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const db = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// WebSocket setup for group chat
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('joinRoom', async (city) => {
    socket.join(city);
    console.log(`User joined room: ${city}`);

    try {
      // Fetch chat history for the city
      const [messages] = await db.query(
        'SELECT * FROM chat_messages WHERE city = ? ORDER BY timestamp ASC',
        [city]
      );
      socket.emit('chatHistory', messages);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  socket.on('message', async (data) => {
    const { city, message, username } = data;
    const timestamp = new Date();

    try {
      // Save message to database
      await db.query(
        'INSERT INTO chat_messages (city, username, message, timestamp) VALUES (?, ?, ?, ?)',
        [city, username, message, timestamp]
      );

      // Broadcast the message to all users in the room
      const newMessage = { city, username, message, timestamp };
      io.to(city).emit('newMessage', newMessage);
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', weatherRoutes);
app.use('/api/notifications', notificationRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

