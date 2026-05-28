const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { hospitalSettings } = require('../store');
const { competencies } = require('../utils/csvLoader');

const SECRET_KEY = 'AKSI_APCI_SECRET_KEY';
const usersFilePath = path.join(process.cwd(), 'api', 'data', 'users.json');

const readUsers = () => {
    try {
        const data = fs.readFileSync(usersFilePath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

exports.login = (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Username dan Password diperlukan' });
    }
    
    const users = readUsers();
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Username atau Password salah' });
    }
    
    const kodeRs = user.kodeRs;
    
    if (kodeRs !== 'ALL' && !hospitalSettings.has(kodeRs)) {
        hospitalSettings.set(kodeRs, { competencies: {} });
    }
    
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role, kodeRs: user.kodeRs }, SECRET_KEY, { expiresIn: '24h' });
    
    res.json({
        token,
        kodeRs,
        role: user.role,
        nama: user.nama,
        message: 'Login berhasil'
    });
};

exports.getSettings = (req, res) => {
    const kodeRs = req.user.kodeRs;
    const settings = hospitalSettings.get(kodeRs) || { competencies: {} };
    
    res.json({
        myCompetencies: settings.competencies,
        allCompetencies: competencies
    });
};

exports.saveSettings = (req, res) => {
    const kodeRs = req.user.kodeRs;
    const { competencies: selectedCompetencies } = req.body;
    
    hospitalSettings.set(kodeRs, { competencies: selectedCompetencies || {} });
    
    res.json({ message: 'Pengaturan berhasil disimpan' });
};
