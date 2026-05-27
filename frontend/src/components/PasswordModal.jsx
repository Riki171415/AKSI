import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, X, Download, ShieldCheck } from 'lucide-react';

// Default export password — can be overridden via Settings (localStorage key: 'exportPassword')
const DEFAULT_PASSWORD = 'APCI2024';

export default function PasswordModal({ isOpen, onClose, onSuccess, fileName = 'Export Excel' }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setShake(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const storedPw = localStorage.getItem('exportPassword') || DEFAULT_PASSWORD;
    if (password === storedPw) {
      setLoading(true);
      setError('');
      setTimeout(() => {
        setLoading(false);
        onSuccess();
        onClose();
      }, 600);
    } else {
      setError('Password salah. Silakan coba lagi.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(6px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
            borderRadius: '1.5rem',
            padding: '2.5rem',
            width: '100%',
            maxWidth: '420px',
            boxShadow: '0 25px 60px -12px rgba(0,0,0,0.35)',
            border: '1px solid rgba(226,232,240,0.8)',
            position: 'relative',
            overflow: 'hidden',
            animation: shake ? 'shake 0.5s ease' : 'slideUp 0.3s ease',
          }}
        >
          {/* Top gradient bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
            background: 'linear-gradient(90deg, var(--primary, #005c8d), var(--secondary, #0ea5e9))'
          }} />

          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1.25rem', right: '1.25rem',
              background: '#f1f5f9', border: 'none', borderRadius: '50%',
              width: '32px', height: '32px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#94a3b8', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#94a3b8'; }}
          >
            <X size={16} />
          </button>

          {/* Icon */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '1rem',
            background: 'linear-gradient(135deg, var(--primary, #005c8d), var(--secondary, #0ea5e9))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem', boxShadow: '0 8px 20px rgba(0,92,141,0.3)',
          }}>
            <ShieldCheck size={30} color="#fff" />
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.5rem' }}>
              Konfirmasi Unduhan
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
              Masukkan password untuk mengunduh<br />
              <strong style={{ color: '#334155' }}>{fileName}</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <div style={{
                position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                color: '#94a3b8', pointerEvents: 'none',
              }}>
                <Lock size={17} />
              </div>
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="Masukkan password download"
                style={{
                  width: '100%',
                  padding: '0.875rem 3rem 0.875rem 2.75rem',
                  borderRadius: '0.875rem',
                  border: `2px solid ${error ? '#fca5a5' : '#e2e8f0'}`,
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#0f172a',
                  outline: 'none',
                  background: error ? 'rgba(254,242,242,0.5)' : '#fff',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                  letterSpacing: '0.05em',
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = 'var(--primary, #005c8d)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,92,141,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = error ? '#fca5a5' : '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#94a3b8', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.6rem 0.875rem', backgroundColor: 'rgba(254,226,226,0.8)',
                borderRadius: '0.625rem', marginBottom: '1rem',
                border: '1px solid #fca5a5',
              }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1, padding: '0.875rem', borderRadius: '0.875rem',
                  border: '2px solid #e2e8f0', background: '#fff',
                  color: '#64748b', fontWeight: 700, cursor: 'pointer',
                  fontSize: '0.875rem', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!password || loading}
                style={{
                  flex: 2, padding: '0.875rem', borderRadius: '0.875rem',
                  border: 'none',
                  background: !password || loading
                    ? '#cbd5e1'
                    : 'linear-gradient(135deg, var(--primary, #005c8d), var(--secondary, #0ea5e9))',
                  color: '#fff', fontWeight: 900, cursor: !password || loading ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s',
                  boxShadow: !password || loading ? 'none' : '0 4px 15px rgba(0,92,141,0.3)',
                }}
              >
                {loading ? (
                  <>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite', display: 'inline-block' }} />
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    Unduh Sekarang
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes shake {
          0%, 100% { transform: translateX(0) }
          20% { transform: translateX(-8px) }
          40% { transform: translateX(8px) }
          60% { transform: translateX(-6px) }
          80% { transform: translateX(6px) }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}
