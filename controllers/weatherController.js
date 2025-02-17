const axios = require('axios');
const db = require('../models/WeatherSearch');
require('dotenv').config();
const { createNotification } = require('./notificationController');

exports.searchWeather = async (req, res) => {
  const { city } = req.body;

  try {
    const weatherResponse = await axios.get(
      `http://api.weatherstack.com/current?access_key=613dc53cf06f24ca0c45f5802c257cfb&query=${city}`
    );

    // Check if the response has the expected data
    const weatherInfo = weatherResponse.data;
    if (!weatherInfo || !weatherInfo.current) {
      return res.status(400).json({ message: 'Invalid city name or no weather data available' });
    }

    // Proceed to insert only if the weather data is valid
    await db.query(
      'INSERT INTO weather_search (user_id, city, weather_info) VALUES (?, ?, ?)',
      [req.user.id, city, JSON.stringify(weatherInfo)]
    );

    res.json(weatherInfo);
  } catch (err) {
    console.error(err); // Log the error for better debugging
    res.status(500).json({ message: 'Error fetching weather data' });
  }
};


exports.getReports = async (req, res) => {
  try {
    const [reports] = await db.query(
      'SELECT ws.city, ws.weather_info, u.username FROM weather_search ws JOIN users u ON ws.user_id = u.id WHERE ws.user_id = ?',
      [req.user.id] // Use the user ID from the token
    );
    // Make sure the weather_info is included properly
    const formattedReports = reports.map(report => {
      return {
        ...report,
        weather_info: JSON.parse(report.weather_info), // Parse the weather_info
      };
    });

    res.json(formattedReports);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching reports' });
  }
};


exports.saveTrip = async (req, res) => {
  const { city, startDate, endDate, notes } = req.body;

  // Check for missing required fields
  if (!city || !startDate || !endDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const tripData = {
      user_id: req.user.id, // Assuming req.user is set by auth middleware
      city,
      start_date: startDate,
      end_date: endDate,
      notes,
      weather_info: JSON.stringify({}), // You can replace with actual weather data
    };

    const [result] = await db.query(
      'INSERT INTO trips (user_id, city, start_date, end_date, notes, weather_info) VALUES (?, ?, ?, ?, ?, ?)',
      [
        tripData.user_id,
        tripData.city,
        tripData.start_date,
        tripData.end_date,
        tripData.notes,
        tripData.weather_info,
      ]
    );

    // Find other users planning to visit the same city
    const [matchingUsers] = await db.query(
      'SELECT DISTINCT t.user_id, u.username FROM trips t JOIN users u ON t.user_id = u.id WHERE t.city = ? AND t.user_id != ?',
      [city, req.user.id]
    );

    // Create notifications for matching users
    for (const user of matchingUsers) {
      await createNotification(
        user.user_id,
        `${req.user.username} is also planning to visit ${city}!`,
        city
      );
    }

    res.status(201).json({ message: 'Trip saved successfully', tripId: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error saving trip' });
  }
};
 
exports.getTrips = async (req, res) => {
  try {
    const [trips] = await db.query('SELECT * FROM trips WHERE user_id = ?', [req.user.id]);
    res.json(trips);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching trips' });
  }
};
exports.updateTrip = async (req, res) => {
  const { tripId, city, startDate, endDate, notes } = req.body;

  // Validate input
  if (!tripId || !city || !startDate || !endDate) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Update trip in the database
    const [result] = await db.query(
      'UPDATE trips SET city = ?, start_date = ?, end_date = ?, notes = ? WHERE id = ? AND user_id = ?',
      [city, startDate, endDate, notes, tripId, req.user.id]
    );

    // Check if any rows were updated
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or not authorized' });
    }

    res.json({ message: 'Trip updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error updating trip' });
  }
};
exports.deleteTrip = async (req, res) => {
  const { tripId } = req.body;

  // Validate input
  if (!tripId) {
    return res.status(400).json({ message: 'Trip ID is required' });
  }

  try {
    // Delete trip from the database
    const [result] = await db.query(
      'DELETE FROM trips WHERE id = ? AND user_id = ?',
      [tripId, req.user.id]
    );

    // Check if any rows were deleted
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found or not authorized' });
    }

    res.json({ message: 'Trip deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error deleting trip' });
  }
};
// Get city matches for group chat (modified to create separate rooms)
exports.getCityMatches = async (req, res) => {
  try {
     // Step 1: Get the logged-in user's username
     const [user] = await db.query('SELECT username FROM users WHERE id = ?', [req.user.id]);
     const username = user.length > 0 ? user[0].username : 'Anonymous'; // Fallback to 'Anonymous' if not found
    // Step 1: Get all the cities the user plans to visit
    const [userTrips] = await db.query('SELECT city FROM trips WHERE user_id = ?', [req.user.id]);

    const userCities = userTrips.map(trip => trip.city);

    // Step 2: Get all the matching trips for those cities
    const [matchingTrips] = await db.query(
      'SELECT t.city, t.start_date, t.end_date, u.username FROM trips t JOIN users u ON t.user_id = u.id WHERE t.city IN (?) AND t.user_id != ?',
      [userCities, req.user.id]
    );

    // Step 3: Organize the matching trips by city, so each city has its own group/room
    const cityMatches = userCities.map((city) => {
      const matchesForCity = matchingTrips.filter(trip => trip.city === city);
      return {
        city,
        matches: matchesForCity,
      };
    });

    res.json({ cityMatches,username }); // Respond with separate city rooms
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching matching trips' });
  }
};

exports.getChatMessages = async (req, res) => {
  const { city } = req.query; // Get the city from the query parameters

  // Check if city is provided
  if (!city) {
    return res.status(400).json({ message: 'City is required' });
  }

  try {
    // Fetch chat messages for the specified city ordered by timestamp
    const [messages] = await db.query(
      'SELECT id, username, message, timestamp FROM chat_messages WHERE city = ? ORDER BY timestamp ASC',
      [city]
    );

    res.json({ messages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching chat messages' });
  }
};






