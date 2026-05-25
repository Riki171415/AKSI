const jwt = require('jsonwebtoken');
const { hospitalSettings } = require('../store');
const { competencies } = require('../utils/csvLoader');

const SECRET_KEY = 'AKSI_APCI_SECRET_KEY';

exports.login = (req, res) => {
    const { kodeRs, password } = req.body;
    
    if (!kodeRs) {
        return res.status(400).json({ message: 'Kode RS diperlukan' });
    }
    
    if (!hospitalSettings.has(kodeRs)) {
        hospitalSettings.set(kodeRs, { competencies: {} });
    }
    
    const token = jwt.sign({ kodeRs }, SECRET_KEY, { expiresIn: '24h' });
    
    res.json({
        token,
        kodeRs,
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
