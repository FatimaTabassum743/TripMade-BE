const db = require('./db');

const createTripsTable = async () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS trips (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      city VARCHAR(255) NOT NULL,
      start_date DATE,
      end_date DATE,
      notes TEXT,
      weather_info JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `;

  try {
    await db.query(sql);
    console.log('Trips table created successfully.');
  } catch (err) {
    console.error('Error creating trips table:', err.message);
  }
};

createTripsTable();
