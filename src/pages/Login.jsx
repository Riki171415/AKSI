import React, { useState, useEffect } from 'react';
import api from '../utils/axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaMath, setCaptchaMath] = useState({ num1: 0, num2: 0 });
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [pendingLoginData, setPendingLoginData] = useState(null);
  const navigate = useNavigate();

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaMath({ num1, num2 });
    setCaptchaAnswer('');
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Username dan Password tidak boleh kosong');
      return;
    }
    
    if (parseInt(captchaAnswer) !== (captchaMath.num1 + captchaMath.num2)) {
      setError('Jawaban verifikasi keamanan (Captcha) salah.');
      generateCaptcha();
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/login', { username, password });
      setPendingLoginData(res.data);
      setShowDisclaimer(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal login. Periksa koneksi ke server.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleAgree = () => {
    if (pendingLoginData) {
      localStorage.setItem('token', pendingLoginData.token);
      localStorage.setItem('kodeRs', pendingLoginData.kodeRs);
      localStorage.setItem('role', pendingLoginData.role);
      localStorage.setItem('nama', pendingLoginData.nama || username);
      navigate('/dashboard');
    }
  };

  const handleDisagree = () => {
    setShowDisclaimer(false);
    setPendingLoginData(null);
  };

  return (
    <div className="login-container">
      <div></div>
      <div className="login-box" style={{ maxWidth: '400px' }}>
        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <img src="/logo_apci.png" alt="APCI Logo" style={{ height: '80px' }} />
        </div>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Selamat Datang</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>
          Analisis Klaim & Kompetensi Rumah Sakit
        </p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(229, 62, 62, 0.1)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 'bold' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Masukkan username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Masukkan password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Verifikasi Keamanan (Berapa {captchaMath.num1} + {captchaMath.num2}?)</label>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input 
                  type="number" 
                  placeholder="Jawaban" 
                  value={captchaAnswer}
                  onChange={(e) => setCaptchaAnswer(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                onClick={generateCaptcha} 
                className="btn-outline" 
                style={{ padding: '0.75rem', height: '100%' }}
                title="Ganti Pertanyaan"
              >
                🔄
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? <span className="spinner"></span> : 'Masuk Sistem'}
          </button>
        </form>
      </div>

      {showDisclaimer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem' }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '550px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#0f172a', textAlign: 'center', fontSize: '1.25rem', fontWeight: 900 }}>
              DISCLAIMER PENGGUNAAN APLIKASI
            </h3>
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem 1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', maxHeight: '300px', overflowY: 'auto', fontSize: '0.85rem', color: '#334155', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: 700 }}>Dengan menggunakan aplikasi ini, Anda menyetujui ketentuan berikut:</p>
              <ol style={{ paddingLeft: '1.25rem', margin: '0 0 1rem 0' }}>
                <li style={{ marginBottom: '0.5rem' }}>Data yang Anda masukkan adalah benar.</li>
                <li style={{ marginBottom: '0.5rem' }}>Anda bertanggung jawab penuh atas penggunaan akun Anda.</li>
                <li style={{ marginBottom: '0.5rem' }}>Data berikut yang akan Anda unduh bersifat rahasia dan hanya ditujukan untuk penggunaan individu atau entitas yang dituju/disetujui/berhak.</li>
                <li style={{ marginBottom: '0.5rem' }}>Aplikasi Ini Diproses di Browser lokal dan tidak dikirimkan atau di simpan di Server manapun atau Pihak ke 3.</li>
                <li style={{ marginBottom: '0.5rem' }}>Developer tidak menyimpan sama sekali data TXT yang telah diupload, merestart aplikasi atau close browser akan otomatis menghapus data txt anda.</li>
                <li style={{ marginBottom: '0.5rem' }}>Apabila data yang Anda terima terdapat kesalahan isi/konten, harap segera memberitahukan kepada APCI.</li>
                <li style={{ marginBottom: '0.5rem' }}>Anda tidak diperkenankan menyebarkan, mendistribusikan atau menyalin data ini.</li>
                <li style={{ marginBottom: '0.5rem' }}>Segala tindakan penyalahgunaan terhadap data ini bukan menjadi tanggung jawab APCI.</li>
              </ol>
              <p style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Terima kasih telah menggunakan aplikasi AKSI-APCI.</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={handleDisagree}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#f1f5f9'}
              >
                TIDAK SETUJU
              </button>
              <button 
                onClick={handleAgree}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={(e) => e.target.style.opacity = '0.9'}
                onMouseOut={(e) => e.target.style.opacity = '1'}
              >
                SAYA SETUJU
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ position: 'relative', marginTop: 'auto', paddingTop: '2rem', paddingBottom: '1.5rem', width: '100%', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.02em', zIndex: 10 }}>
        Copyright &copy; APCI Asosiasi Praktisi Casemix Indonesia
      </div>
    </div>
  );
}
