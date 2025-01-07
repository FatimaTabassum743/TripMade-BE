const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const http = require('http');
const socketIo = require('socket.io');
const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const db = require('./db');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// WebSocket setup for group chat
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*', // Replace with your frontend domain in production
  },
});
io.on('connection', (socket) => {
  console.log('A user connected');

  // Join the user to a room (city)
  socket.on('joinRoom', (city) => {
    socket.join(city);
    console.log(`User joined room: ${city}`);

    // Fetch and send chat history for the city
    db.query('SELECT username, message, timestamp FROM chat_messages WHERE city = ? ORDER BY timestamp ASC', 
      [city], 
      (err, results) => {
        if (err) {
          console.error('Error fetching chat history:', err);
          return;
        }
        socket.emit('chatHistory', results); // Send chat history when joining the room
      }
    );
  });

  // Listen for a new message
  socket.on('message', ({ city, message, username }) => {
    const newMessage = { city, username, message };

    // Save message to the database
    db.query('INSERT INTO chat_messages (city, username, message) VALUES (?, ?, ?)', 
      [city, username, message], 
      (err) => {
        if (err) {
          console.error('Error saving message:', err);
          return;
        }

        // Emit the new message to all users in the room
        io.to(city).emit('message', newMessage);  // This will broadcast the message to all users in the city room
      }
    );
  });

  // Cleanup when user disconnects
  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', weatherRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
