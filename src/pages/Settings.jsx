import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { ShieldCheck, ShieldOff, Smartphone, QrCode, Key, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export default function Settings() {
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [myCompetencies, setMyCompetencies] = useState({});
  const [kodeRs, setKodeRs] = useState('');
  const [namaRs, setNamaRs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaStep, setMfaStep] = useState('idle'); // idle | setup | confirm | disable
  const [qrCode, setQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [mfaMessage, setMfaMessage] = useState({ text: '', type: '' });

  const levels = ["Dasar", "Madya", "Utama", "Paripurna"];

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const showMfaMsg = (text, type = 'success') => {
    setMfaMessage({ text, type });
    if (type === 'success') setTimeout(() => setMfaMessage({ text: '', type: '' }), 4000);
  };

  useEffect(() => {
    const fetchMaster = async () => {
      try {
        const res = await api.get('/api/settings', getAuthHeader());
        setAllCompetencies(res.data.allCompetencies || []);
        const savedConfig = localStorage.getItem('iDRG_RS_Config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          setKodeRs(config.kodeRs || '');
          setNamaRs(config.namaRs || '');
          setMyCompetencies(config.competencies || {});
        }

        // Load MFA status
        const mfaRes = await api.get('/api/auth/mfa/status', getAuthHeader());
        setMfaEnabled(mfaRes.data.mfaEnabled);
      } catch (err) {
        console.error(err);
        setMessage('Gagal mengambil data master kompetensi.');
      } finally {
        setLoading(false);
      }
    };
    fetchMaster();
  }, []);

  const handleChange = (comp, level) => {
    setMyCompetencies(prev => {
      const n = { ...prev };
      if (!level) delete n[comp]; else n[comp] = level;
      return n;
    });
  };

  const handleSave = () => {
    setSaving(true); setMessage('');
    if (!kodeRs.trim() || !namaRs.trim()) {
      setMessage('Gagal: Kode RS dan Nama RS wajib diisi.');
      setSaving(false); return;
    }
    try {
      localStorage.setItem('iDRG_RS_Config', JSON.stringify({ kodeRs, namaRs, competencies: myCompetencies }));
      setMessage('Pengaturan berhasil disimpan di browser!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Gagal menyimpan pengaturan.'); }
    finally { setSaving(false); }
  };

  // ── MFA: Start Setup ─────────────────────────────────────────────────────

  const handleStartSetup = async () => {
    setMfaLoading(true); setMfaMessage({ text: '', type: '' });
    try {
      const res = await api.post('/api/auth/mfa/setup', {}, getAuthHeader());
      setQrCode(res.data.qrCode);
      setMfaSecret(res.data.secret);
      setOtpInput('');
      setMfaStep('setup');
    } catch (err) {
      showMfaMsg(err.response?.data?.message || 'Gagal generate QR Code', 'error');
    } finally { setMfaLoading(false); }
  };

  // ── MFA: Confirm Setup ───────────────────────────────────────────────────

  const handleConfirmSetup = async () => {
    const code = otpInput.replace(/\s/g, '');
    if (code.length !== 6) { showMfaMsg('Masukkan 6 digit kode OTP', 'error'); return; }
    setMfaLoading(true);
    try {
      const res = await api.post('/api/auth/mfa/verify-setup', { otpCode: code }, getAuthHeader());
      setMfaEnabled(true);
      setMfaStep('idle');
      setOtpInput(''); setQrCode(''); setMfaSecret('');
      showMfaMsg(res.data.message || 'MFA berhasil diaktifkan!', 'success');
    } catch (err) {
      showMfaMsg(err.response?.data?.message || 'Kode OTP tidak valid', 'error');
      setOtpInput('');
    } finally { setMfaLoading(false); }
  };

  // ── MFA: Disable ─────────────────────────────────────────────────────────

  const handleDisable = async () => {
    const code = otpInput.replace(/\s/g, '');
    if (!mfaPassword) { showMfaMsg('Masukkan password Anda', 'error'); return; }
    setMfaLoading(true);
    try {
      const res = await api.post('/api/auth/mfa/disable', { password: mfaPassword, otpCode: code }, getAuthHeader());
      setMfaEnabled(false);
      setMfaStep('idle');
      setOtpInput(''); setMfaPassword('');
      showMfaMsg(res.data.message || 'MFA dinonaktifkan', 'success');
    } catch (err) {
      showMfaMsg(err.response?.data?.message || 'Gagal menonaktifkan MFA', 'error');
    } finally { setMfaLoading(false); }
  };

  const cancelMfa = () => { setMfaStep('idle'); setOtpInput(''); setMfaPassword(''); setQrCode(''); setMfaSecret(''); setMfaMessage({ text: '', type: '' }); };

  if (loading) return <div className="page-content"><span className="spinner"></span> Memuat pengaturan...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Pengaturan</h1>
          <p style={{ color: 'var(--text-muted)' }}>Profil Rumah Sakit, kompetensi layanan, dan keamanan akun.</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: message.includes('Gagal') ? 'rgba(229,62,62,0.1)' : 'rgba(56,161,105,0.1)', color: message.includes('Gagal') ? 'var(--danger)' : 'var(--success)', borderRadius: '8px' }}>
          {message}
        </div>
      )}

      {/* ── Profil RS ── */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Profil Rumah Sakit</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Kode RS</label>
            <input type="text" value={kodeRs} onChange={e => setKodeRs(e.target.value)} placeholder="Contoh: 3171012" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nama RS</label>
            <input type="text" value={namaRs} onChange={e => setNamaRs(e.target.value)} placeholder="Contoh: RSUD Kota Pusat" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }} />
          </div>
        </div>
      </div>

      {/* ── MFA / Keamanan Akun ── */}
      <div className="card" style={{ marginBottom: '1.5rem', borderLeft: mfaEnabled ? '4px solid #10b981' : '4px solid #94a3b8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: mfaStep !== 'idle' ? '1.5rem' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: mfaEnabled ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#94a3b8,#64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {mfaEnabled ? <ShieldCheck size={24} color="white" /> : <ShieldOff size={24} color="white" />}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>
                Autentikasi Dua Faktor (MFA)
                <span style={{ marginLeft: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: mfaEnabled ? '#d1fae5' : '#f1f5f9', color: mfaEnabled ? '#065f46' : '#475569' }}>
                  {mfaEnabled ? '✓ AKTIF' : 'TIDAK AKTIF'}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                {mfaEnabled ? 'Login memerlukan kode dari Authenticator app' : 'Aktifkan untuk keamanan tambahan dengan Google/Microsoft Authenticator'}
              </div>
            </div>
          </div>
          {mfaStep === 'idle' && (
            <button
              onClick={() => mfaEnabled ? setMfaStep('disable') : handleStartSetup()}
              disabled={mfaLoading}
              style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', border: 'none', backgroundColor: mfaEnabled ? '#fee2e2' : '#dbeafe', color: mfaEnabled ? '#dc2626' : '#1d4ed8' }}
            >
              {mfaLoading ? '...' : mfaEnabled ? '🔓 Nonaktifkan' : '🔐 Aktifkan MFA'}
            </button>
          )}
        </div>

        {mfaMessage.text && (
          <div style={{ padding: '0.75rem 1rem', borderRadius: '8px', marginTop: '1rem', backgroundColor: mfaMessage.type === 'error' ? 'rgba(220,38,38,0.1)' : 'rgba(16,185,129,0.1)', color: mfaMessage.type === 'error' ? '#dc2626' : '#065f46', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {mfaMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {mfaMessage.text}
          </div>
        )}

        {/* ── Setup: Show QR Code ── */}
        {mfaStep === 'setup' && qrCode && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
              <div>
                <h4 style={{ margin: '0 0 1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <QrCode size={18} color="var(--primary)" /> Langkah 1: Scan QR Code
                </h4>
                <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '1rem', display: 'inline-block', backgroundColor: 'white' }}>
                  <img src={qrCode} alt="MFA QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: '1.5' }}>
                  Scan dengan <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, atau <strong>Authy</strong>
                </p>
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 700 }}>KODE MANUAL (jika QR tidak bisa di-scan):</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', color: '#0f172a', wordBreak: 'break-all' }}>{mfaSecret}</div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Key size={18} color="var(--primary)" /> Langkah 2: Masukkan Kode OTP
                </h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.5' }}>
                  Setelah scan, masukkan kode 6 digit yang muncul di Authenticator app untuk mengonfirmasi setup.
                </p>
                <input
                  type="text" inputMode="numeric" maxLength={6} placeholder="_ _ _ _ _ _"
                  value={otpInput}
                  onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '8px', border: '2px solid var(--border)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '0.5rem', textAlign: 'center', outline: 'none', boxSizing: 'border-box' }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                  <button onClick={cancelMfa} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
                  <button
                    onClick={handleConfirmSetup}
                    disabled={mfaLoading || otpInput.length !== 6}
                    className="btn-primary" style={{ flex: 2 }}
                  >
                    {mfaLoading ? 'Memverifikasi...' : '✓ Aktifkan MFA'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Disable MFA ── */}
        {mfaStep === 'disable' && (
          <div style={{ marginTop: '1.5rem', maxWidth: '400px' }}>
            <h4 style={{ margin: '0 0 1rem', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={18} /> Konfirmasi Nonaktifkan MFA
            </h4>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Password Akun Anda</label>
              <input type="password" placeholder="Masukkan password" value={mfaPassword} onChange={e => setMfaPassword(e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Kode OTP (dari Authenticator)</label>
              <input type="text" inputMode="numeric" maxLength={6} placeholder="_ _ _ _ _ _"
                value={otpInput} onChange={e => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                style={{ textAlign: 'center', fontSize: '1.3rem', fontWeight: 900, letterSpacing: '0.4rem' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={cancelMfa} style={{ flex: 1, padding: '0.7rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: '#f8fafc', color: '#475569', fontWeight: 700, cursor: 'pointer' }}>Batal</button>
              <button onClick={handleDisable} disabled={mfaLoading || !mfaPassword}
                style={{ flex: 2, padding: '0.7rem', borderRadius: '8px', backgroundColor: '#dc2626', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', opacity: mfaLoading ? 0.7 : 1 }}>
                {mfaLoading ? 'Memproses...' : 'Nonaktifkan MFA'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 24 Kompetensi Layanan ── */}
      <div className="card">
        <h3 style={{ margin: '0 0 1rem 0' }}>24 Kompetensi Layanan</h3>
        <div className="competency-list">
          {allCompetencies.map(comp => (
            <div key={comp} className="competency-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>{comp}</span>
              <select value={myCompetencies[comp] || ""} onChange={e => handleChange(comp, e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}>
                <option value="">-- Tidak Tersedia --</option>
                {levels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
