import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [kodeRs, setKodeRs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaMath, setCaptchaMath] = useState({ num1: 0, num2: 0 });
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
    if (!kodeRs) {
      setError('Kode RS tidak boleh kosong');
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
      const res = await axios.post('http://localhost:5000/api/login', { kodeRs });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('kodeRs', res.data.kodeRs);
      navigate('/dashboard');
    } catch (err) {
      setError('Gagal login. Periksa koneksi ke server.');
      generateCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
          <img src="/logo_apci.png" alt="APCI Logo" style={{ height: '80px' }} />
        </div>
        <h2 style={{ marginBottom: '0.5rem' }}>Selamat Datang</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Analisis Klaim & Kompetensi Rumah Sakit
        </p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(229, 62, 62, 0.1)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Kode Rumah Sakit</label>
            <input 
              type="text" 
              placeholder="Masukkan Kode RS (contoh: 3273015)" 
              value={kodeRs}
              onChange={(e) => setKodeRs(e.target.value)}
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

          <button type="submit" className="btn-primary btn-block" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? <span className="spinner"></span> : 'Masuk Sistem'}
          </button>
        </form>
      </div>
    </div>
  );
}
