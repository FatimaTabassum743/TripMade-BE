const express = require('express');
const { searchWeather, getReports,getTrips,saveTrip,updateTrip,deleteTrip, getCityMatches, getChatMessages } = require('../controllers/weatherController');
const auth = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/weather', auth, searchWeather);
router.get('/reports', auth, getReports);
router.post('/trip', auth, saveTrip);
router.get('/trips', auth, getTrips);
router.post('/updateTrip',auth, updateTrip);
router.post('/deleteTrip',auth, deleteTrip);
router.get('/getCityMatches', auth, getCityMatches);
router.get('/getChatMessages', auth, getChatMessages);


module.exports = router;

