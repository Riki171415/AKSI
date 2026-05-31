const fs = require('fs');
const path = require('path');

let initialUsers = [];
try {
  const usersPath = path.join(__dirname, 'data', 'users.json');
  initialUsers = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
} catch (err) {
  // gracefully default if missing
}

module.exports = {
    hospitalSettings: new Map(), // KODE_RS -> { competencies: [] }
    users: initialUsers // In-memory database array
};
