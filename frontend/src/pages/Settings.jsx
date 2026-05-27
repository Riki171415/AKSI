import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [myCompetencies, setMyCompetencies] = useState({});
  const [kodeRs, setKodeRs] = useState('');
  const [namaRs, setNamaRs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [pwMessage, setPwMessage] = useState('');

  const levels = ["Dasar", "Madya", "Utama", "Paripurna"];

  useEffect(() => {
    // Fetch master competencies from backend to know what the 24 competencies are
    const fetchMaster = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/settings', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAllCompetencies(res.data.allCompetencies || []);
        
        // Load from localStorage instead of backend
        const savedConfig = localStorage.getItem('iDRG_RS_Config');
        if (savedConfig) {
          const config = JSON.parse(savedConfig);
          setKodeRs(config.kodeRs || '');
          setNamaRs(config.namaRs || '');
          setMyCompetencies(config.competencies || {});
        }
        // Load export password
        setExportPassword(localStorage.getItem('exportPassword') || 'APCI2024');
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
      const newSettings = { ...prev };
      if (!level) {
        delete newSettings[comp];
      } else {
        newSettings[comp] = level;
      }
      return newSettings;
    });
  };

  const handleSave = () => {
    setSaving(true);
    setMessage('');
    
    if (!kodeRs.trim() || !namaRs.trim()) {
      setMessage('Gagal: Kode RS dan Nama RS wajib diisi.');
      setSaving(false);
      return;
    }

    try {
      const config = {
        kodeRs,
        namaRs,
        competencies: myCompetencies
      };
      localStorage.setItem('iDRG_RS_Config', JSON.stringify(config));
      setMessage('Pengaturan berhasil disimpan di browser!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = () => {
    setPwMessage('');
    if (!newPassword.trim()) {
      setPwMessage('error:Password baru tidak boleh kosong.');
      return;
    }
    if (newPassword.length < 6) {
      setPwMessage('error:Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage('error:Konfirmasi password tidak cocok.');
      return;
    }
    localStorage.setItem('exportPassword', newPassword);
    setExportPassword(newPassword);
    setNewPassword('');
    setConfirmPassword('');
    setPwMessage('success:Password download berhasil diubah!');
    setTimeout(() => setPwMessage(''), 3000);
  };

  if (loading) return <div className="page-content"><span className="spinner"></span> Memuat pengaturan...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Pengaturan Tingkat Kompetensi RS</h1>
          <p style={{ color: 'var(--text-muted)' }}>Profil Rumah Sakit dan tingkat kemampuan layanan (Dasar, Madya, Utama, Paripurna).</p>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem', marginBottom: '1.5rem', backgroundColor: message.includes('Gagal') ? 'rgba(229, 62, 62, 0.1)' : 'rgba(56, 161, 105, 0.1)', color: message.includes('Gagal') ? 'var(--danger)' : 'var(--success)', borderRadius: '8px' }}>
          {message}
        </div>
      )}

      {/* EXPORT PASSWORD CARD */}
      <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid rgba(226,232,240,0.8)', borderRadius: '1rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ backgroundColor: 'rgba(0,92,141,0.1)', color: 'var(--primary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900 }}>Keamanan Unduhan Excel</h3>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Password saat ini: <strong style={{ color: 'var(--primary)' }}>{exportPassword ? '••••••••' : 'APCI2024 (default)'}</strong></p>
          </div>
        </div>

        {pwMessage && (
          <div style={{ padding: '0.75rem 1rem', marginBottom: '1rem', backgroundColor: pwMessage.startsWith('error') ? 'rgba(229,62,62,0.08)' : 'rgba(56,161,105,0.08)', color: pwMessage.startsWith('error') ? 'var(--danger)' : 'var(--success)', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
            {pwMessage.replace(/^(error|success):/, '')}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Password Baru</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Konfirmasi Password Baru</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password baru"
                style={{ width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0 }}>
                {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        </div>
        <button onClick={handleChangePassword} className="btn-primary" style={{ marginTop: '1rem', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', padding: '0.6rem 1.5rem' }}>
          Simpan Password Download
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Profil Rumah Sakit</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Kode RS</label>
            <input 
              type="text" 
              value={kodeRs} 
              onChange={(e) => setKodeRs(e.target.value)} 
              placeholder="Contoh: 3171012"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-main)' }}>Nama RS</label>
            <input 
              type="text" 
              value={namaRs} 
              onChange={(e) => setNamaRs(e.target.value)} 
              placeholder="Contoh: RSUD Kota Pusat"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 1rem 0' }}>24 Kompetensi Layanan</h3>
        <div className="competency-list">
          {allCompetencies.map(comp => (
            <div key={comp} className="competency-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>{comp}</span>
              <select 
                value={myCompetencies[comp] || ""}
                onChange={(e) => handleChange(comp, e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', outline: 'none' }}
              >
                <option value="">-- Tidak Tersedia --</option>
                {levels.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
