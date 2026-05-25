import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Settings() {
  const [allCompetencies, setAllCompetencies] = useState([]);
  const [myCompetencies, setMyCompetencies] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      setMyCompetencies(new Set(res.data.myCompetencies));
    } catch (err) {
      console.error(err);
      setMessage('Gagal mengambil data pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (comp) => {
    const newSet = new Set(myCompetencies);
    if (newSet.has(comp)) {
      newSet.delete(comp);
    } else {
      newSet.add(comp);
    }
    setMyCompetencies(newSet);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/settings', 
        { competencies: Array.from(myCompetencies) },
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
          <h1 className="page-title">Pengaturan Kompetensi RS</h1>
          <p style={{ color: 'var(--text-muted)' }}>Centang layanan yang tersedia di Rumah Sakit Anda. Ini akan digunakan sebagai dasar analisis klaim.</p>
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
            <label key={comp} className="competency-item">
              <input 
                type="checkbox" 
                checked={myCompetencies.has(comp)}
                onChange={() => handleToggle(comp)}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>{comp}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
