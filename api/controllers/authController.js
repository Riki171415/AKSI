const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { hospitalSettings, users } = require('../store');
const { competencies } = require('../utils/csvLoader');
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

const SECRET_KEY = 'AKSI_APCI_SECRET_KEY';
const MFA_TEMP_SECRET = 'AKSI_MFA_TEMP_2025';
const APP_NAME = 'AKSI-APCI';

// Configure TOTP - 30 second window, allow 1 step tolerance for clock skew
authenticator.options = { step: 30, window: 1 };

// Using users from store.js directly

// ── Login ────────────────────────────────────────────────────────────────────

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: 'Username dan Password diperlukan' });

  const user = users.find(u => u.username === username && u.password === password);
  if (!user)
    return res.status(401).json({ message: 'Username atau Password salah' });

  const kodeRs = user.kodeRs;
  if (kodeRs !== 'ALL' && !hospitalSettings.has(kodeRs))
    hospitalSettings.set(kodeRs, { competencies: {} });

  // If MFA is enabled, return tempToken for OTP verification step
  if (user.mfaEnabled && user.mfaSecret) {
    const tempToken = jwt.sign(
      { id: user.id, username: user.username, mfaStep: true },
      SECRET_KEY,
      { expiresIn: '5m' }
    );
    return res.json({ mfaRequired: true, tempToken });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, kodeRs: user.kodeRs },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
  res.json({ token, kodeRs, role: user.role, nama: user.nama, message: 'Login berhasil' });
};

// ── MFA: Verify OTP during login ─────────────────────────────────────────────

exports.verifyMfaLogin = (req, res) => {
  const { tempToken, otpCode } = req.body;
  if (!tempToken || !otpCode)
    return res.status(400).json({ message: 'Token sementara dan kode OTP diperlukan' });

  let payload;
  try {
    payload = jwt.verify(tempToken, SECRET_KEY);
  } catch {
    return res.status(401).json({ message: 'Token tidak valid atau sudah kadaluarsa' });
  }

  if (!payload.mfaStep)
    return res.status(401).json({ message: 'Token tidak valid untuk verifikasi MFA' });

  const user = users.find(u => u.id === payload.id);
  if (!user || !user.mfaEnabled || !user.mfaSecret)
    return res.status(401).json({ message: 'MFA tidak aktif untuk akun ini' });

  const isValid = authenticator.verify({ token: otpCode.replace(/\s/g, ''), secret: user.mfaSecret });
  if (!isValid)
    return res.status(401).json({ message: 'Kode OTP tidak valid atau sudah kadaluarsa' });

  const kodeRs = user.kodeRs;
  if (kodeRs !== 'ALL' && !hospitalSettings.has(kodeRs))
    hospitalSettings.set(kodeRs, { competencies: {} });

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, kodeRs: user.kodeRs },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
  res.json({ token, kodeRs, role: user.role, nama: user.nama, message: 'Login berhasil' });
};

// ── MFA: Generate setup (QR Code) ───────────────────────────────────────────

exports.generateMfaSetup = async (req, res) => {
  const user = req.user;
  const dbUser = users.find(u => u.id === user.id);
  if (!dbUser) return res.status(404).json({ message: 'User tidak ditemukan' });

  if (dbUser.mfaEnabled)
    return res.status(400).json({ message: 'MFA sudah aktif. Nonaktifkan terlebih dahulu.' });

  // Generate a new secret (stored temporarily until confirmed)
  const secret = authenticator.generateSecret();
  const otpAuthUrl = authenticator.keyuri(dbUser.username, APP_NAME, secret);

  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    // Store pending secret in user record (not yet active)
    // Since users is a reference to the array in store.js, changes to dbUser are automatically persisted in memory
    res.json({ secret, qrCode: qrCodeDataUrl });
  } catch (err) {
    res.status(500).json({ message: 'Gagal generate QR Code' });
  }
};

// ── MFA: Verify setup (confirm OTP to activate) ──────────────────────────────

exports.verifyMfaSetup = (req, res) => {
  const { otpCode } = req.body;
  if (!otpCode) return res.status(400).json({ message: 'Kode OTP diperlukan' });

  const dbUser = users.find(u => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ message: 'User tidak ditemukan' });

  if (!dbUser.mfaPendingSecret)
    return res.status(400).json({ message: 'Tidak ada setup MFA yang menunggu konfirmasi. Mulai setup ulang.' });

  const isValid = authenticator.verify({ token: otpCode.replace(/\s/g, ''), secret: dbUser.mfaPendingSecret });
  if (!isValid)
    return res.status(401).json({ message: 'Kode OTP tidak valid. Pastikan waktu HP sudah sinkron.' });

  dbUser.mfaSecret = dbUser.mfaPendingSecret;
  dbUser.mfaPendingSecret = null;
  dbUser.mfaEnabled = true;

  res.json({ message: 'MFA berhasil diaktifkan! Login berikutnya akan memerlukan kode Authenticator.' });
};

// ── MFA: Disable (self) ──────────────────────────────────────────────────────

exports.disableMfa = (req, res) => {
  const { password, otpCode } = req.body;
  if (!password) return res.status(400).json({ message: 'Password diperlukan untuk menonaktifkan MFA' });

  const dbUser = users.find(u => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ message: 'User tidak ditemukan' });

  if (dbUser.password !== password)
    return res.status(401).json({ message: 'Password salah' });

  if (dbUser.mfaEnabled && dbUser.mfaSecret && otpCode) {
    const isValid = authenticator.verify({ token: otpCode.replace(/\s/g, ''), secret: dbUser.mfaSecret });
    if (!isValid)
      return res.status(401).json({ message: 'Kode OTP tidak valid' });
  }

  dbUser.mfaEnabled = false;
  dbUser.mfaSecret = null;
  dbUser.mfaPendingSecret = null;

  res.json({ message: 'MFA berhasil dinonaktifkan.' });
};

// ── MFA: Admin reset user MFA ────────────────────────────────────────────────

exports.adminResetMfa = (req, res) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ message: 'Akses ditolak' });

  const { userId } = req.params;
  const users = readUsers();
  const target = users.find(u => u.id === parseInt(userId) || u.id === userId);
  if (!target) return res.status(404).json({ message: 'User tidak ditemukan' });

  target.mfaEnabled = false;
  target.mfaSecret = null;
  target.mfaPendingSecret = null;

  res.json({ message: `MFA untuk user "${target.username}" berhasil di-reset oleh admin.` });
};

// ── MFA: Get status ──────────────────────────────────────────────────────────

exports.getMfaStatus = (req, res) => {
  const dbUser = users.find(u => u.id === req.user.id);
  if (!dbUser) return res.status(404).json({ message: 'User tidak ditemukan' });
  res.json({ mfaEnabled: !!dbUser.mfaEnabled });
};

// ── Settings ─────────────────────────────────────────────────────────────────

exports.getSettings = (req, res) => {
  const kodeRs = req.user.kodeRs;
  const settings = hospitalSettings.get(kodeRs) || { competencies: {} };
  res.json({ myCompetencies: settings.competencies, allCompetencies: competencies });
};

exports.saveSettings = (req, res) => {
  const kodeRs = req.user.kodeRs;
  const { competencies: selectedCompetencies } = req.body;
  hospitalSettings.set(kodeRs, { competencies: selectedCompetencies || {} });
  res.json({ message: 'Pengaturan berhasil disimpan' });
};
