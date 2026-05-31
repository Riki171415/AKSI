const fs = require('fs');
const path = require('path');

const usersFilePath = path.join(__dirname, '../data/users.json');

const readUsers = () => {
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

const writeUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

exports.getAllUsers = (req, res) => {
    const users = readUsers();
    // Don't send passwords to frontend
    const sanitizedUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        role: u.role,
        kodeRs: u.kodeRs,
        nama: u.nama,
        mfaEnabled: !!u.mfaEnabled
    }));
    res.json(sanitizedUsers);
};

exports.createUser = (req, res) => {
    const { username, password, role, kodeRs, nama } = req.body;
    
    if (!username || !password || !role || !kodeRs) {
        return res.status(400).json({ message: 'Semua field wajib diisi' });
    }
    
    const users = readUsers();
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Username sudah digunakan' });
    }
    
    const newUser = {
        id: Date.now().toString(),
        username,
        password, // In real app, hash this!
        role,
        kodeRs,
        nama
    };
    
    users.push(newUser);
    writeUsers(users);
    
    res.status(201).json({ message: 'User berhasil ditambahkan', user: { id: newUser.id, username, role, kodeRs, nama } });
};

exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, password, role, kodeRs, nama } = req.body;
    
    const users = readUsers();
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    // Check if new username conflicts
    if (username && username !== users[index].username && users.find(u => u.username === username)) {
        return res.status(400).json({ message: 'Username sudah digunakan' });
    }
    
    users[index] = {
        ...users[index],
        username: username || users[index].username,
        role: role || users[index].role,
        kodeRs: kodeRs || users[index].kodeRs,
        nama: nama || users[index].nama
    };
    
    if (password) {
        users[index].password = password; // Should hash
    }
    
    writeUsers(users);
    
    const updatedUser = { ...users[index] };
    delete updatedUser.password;
    
    res.json({ message: 'User berhasil diupdate', user: updatedUser });
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    let users = readUsers();
    
    const initialLength = users.length;
    users = users.filter(u => u.id !== id);
    
    if (users.length === initialLength) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    writeUsers(users);
    res.json({ message: 'User berhasil dihapus' });
};
