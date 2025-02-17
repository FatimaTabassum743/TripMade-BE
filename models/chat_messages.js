const createTableQuery = `
  CREATE TABLE chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

module.exports = { createTableQuery };