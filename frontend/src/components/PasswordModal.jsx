import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, Download, ShieldCheck, CheckCircle } from 'lucide-react';

export default function PasswordModal({ isOpen, onClose, onSuccess, fileName = 'Export Excel' }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const strength = !password ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : 3;
  const strengthLabel = ['', 'Lemah', 'Sedang', 'Kuat'];
  const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'];

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setConfirmPassword('');
      setError('');
      setShake(false);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Password tidak boleh kosong.');
      triggerShake();
      return;
    }
    if (password.length < 4) {
      setError('Password minimal 4 karakter.');
      triggerShake();
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      triggerShake();
      return;
    }

    setLoading(true);
    setTimeout(() => {
      onSuccess(password);
      onClose();
      setLoading(false);
    }, 400);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{
          background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
          borderRadius: '1.5rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
          border: '1px solid rgba(226,232,240,0.8)',
          position: 'relative',
          overflow: 'hidden',
          animation: shake ? 'shake 0.5s ease' : 'slideUp 0.3s ease',
        }}>
          {/* Top gradient bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, var(--primary, #005c8d), #0ea5e9)' }} />

          {/* Close button */}
          <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}>
            <X size={16} />
          </button>

          {/* Icon */}
          <div style={{ width: '64px', height: '64px', borderRadius: '1rem', background: 'linear-gradient(135deg, var(--primary, #005c8d), #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 8px 20px rgba(0,92,141,0.3)' }}>
            <ShieldCheck size={30} color="#fff" />
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Proteksi File Excel
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0, lineHeight: 1.7 }}>
              Buat password untuk mengamankan<br />
              <strong style={{ color: '#334155' }}>{fileName}</strong>
              <br />
              <span style={{ fontSize: '0.78rem' }}>File hanya bisa dibuka dengan password ini.</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Password Field */}
            <div style={{ marginBottom: '0.875rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Buat Password File
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                  <Lock size={16} />
                </div>
                <input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="Ketik password file Excel..."
                  style={{
                    width: '100%', padding: '0.875rem 3rem 0.875rem 2.75rem',
                    borderRadius: '0.875rem', border: `2px solid ${error ? '#fca5a5' : password ? (strength === 1 ? '#fbbf24' : strength === 2 ? '#f59e0b' : '#10b981') : '#e2e8f0'}`,
                    fontSize: '0.9rem', fontWeight: 600, color: '#0f172a',
                    outline: 'none', background: '#fff', transition: 'border-color 0.2s',
                    boxSizing: 'border-box', letterSpacing: '0.04em',
                  }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{ flex: 1, height: '4px', borderRadius: '2px', backgroundColor: i <= strength ? strengthColor[strength] : '#e2e8f0', transition: 'background-color 0.3s' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: strengthColor[strength] }}>
                    Kekuatan: {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Konfirmasi Password
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                  {confirmPassword && confirmPassword === password
                    ? <CheckCircle size={16} color="#10b981" />
                    : <Lock size={16} />}
                </div>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="Ulangi password..."
                  style={{
                    width: '100%', padding: '0.875rem 3rem 0.875rem 2.75rem',
                    borderRadius: '0.875rem',
                    border: `2px solid ${error && error.includes('cocok') ? '#fca5a5' : confirmPassword && confirmPassword === password ? '#10b981' : '#e2e8f0'}`,
                    fontSize: '0.9rem', fontWeight: 600, color: '#0f172a',
                    outline: 'none', background: '#fff', transition: 'border-color 0.2s',
                    boxSizing: 'border-box', letterSpacing: '0.04em',
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                  style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.875rem', backgroundColor: 'rgba(254,226,226,0.8)', borderRadius: '0.625rem', marginBottom: '1rem', border: '1px solid #fca5a5' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* Info box */}
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,92,141,0.05)', borderRadius: '0.75rem', marginBottom: '1.25rem', border: '1px solid rgba(0,92,141,0.12)' }}>
              <p style={{ margin: 0, fontSize: '0.74rem', color: '#475569', lineHeight: 1.6 }}>
                ⚠️ <strong>Simpan password ini!</strong> Password tidak dapat dipulihkan jika lupa. File akan terenkripsi dan hanya bisa dibuka di Excel dengan password yang sama.
              </p>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={onClose}
                style={{ flex: 1, padding: '0.875rem', borderRadius: '0.875rem', border: '2px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                Batal
              </button>
              <button type="submit" disabled={!password || !confirmPassword || loading}
                style={{
                  flex: 2, padding: '0.875rem', borderRadius: '0.875rem', border: 'none',
                  background: (!password || !confirmPassword || loading) ? '#cbd5e1' : 'linear-gradient(135deg, var(--primary, #005c8d), #0ea5e9)',
                  color: '#fff', fontWeight: 900, cursor: (!password || !confirmPassword || loading) ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: (!password || !confirmPassword || loading) ? 'none' : '0 4px 15px rgba(0,92,141,0.3)',
                }}>
                {loading ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                    Mengenkripsi...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Unduh & Proteksi
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) scale(0.97) } to { opacity:1; transform:translateY(0) scale(1) } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>
    </>
  );
}
