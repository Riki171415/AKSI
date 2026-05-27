import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Settings() {
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [myCompetencies, setMyCompetencies] = useState({});
  const [kodeRs, setKodeRs] = useState('');
  const [namaRs, setNamaRs] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
