import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Settings() {
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [myCompetencies, setMyCompetencies] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const levels = ["Dasar", "Madya", "Utama", "Paripurna"];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllCompetencies(res.data.allCompetencies);
      setMyCompetencies(res.data.myCompetencies || {});
    } catch (err) {
      console.error(err);
      setMessage('Gagal mengambil data pengaturan.');
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/settings', 
        { competencies: myCompetencies },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage('Pengaturan berhasil disimpan!');
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
          <p style={{ color: 'var(--text-muted)' }}>Pilih tingkat kemampuan layanan yang tersedia di Rumah Sakit Anda (Dasar, Madya, Utama, Paripurna).</p>
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

      <div className="card">
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
