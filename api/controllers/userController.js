const fs = require('fs');
const path = require('path');

const { users } = require('../store');

exports.getAllUsers = (req, res) => {
    // Users is already loaded in memory
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
    
    // Users array already exists
    
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
    // writeUsers is not needed since users is in memory
    
    res.status(201).json({ message: 'User berhasil ditambahkan', user: { id: newUser.id, username, role, kodeRs, nama } });
};

exports.updateUser = (req, res) => {
    const { id } = req.params;
    const { username, password, role, kodeRs, nama } = req.body;
    
    // Users array already exists
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
    
    // writeUsers is not needed since users is in memory
    
    const updatedUser = { ...users[index] };
    delete updatedUser.password;
    
    res.json({ message: 'User berhasil diupdate', user: updatedUser });
};

exports.deleteUser = (req, res) => {
    const { id } = req.params;
    // Find user by id in memory array
    
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'User tidak ditemukan' });
    }
    
    users.splice(index, 1);
    
    res.json({ message: 'User berhasil dihapus' });
};
