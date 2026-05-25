const jwt = require('jsonwebtoken');
const SECRET_KEY = 'AKSI_APCI_SECRET_KEY';

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Akses ditolak. Token tidak ada.' });
    
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (ex) {
        res.status(400).json({ message: 'Token tidak valid.' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Akses ditolak. Membutuhkan hak akses admin.' });
    }
};

module.exports = {
    verifyToken,
    requireAdmin
};
