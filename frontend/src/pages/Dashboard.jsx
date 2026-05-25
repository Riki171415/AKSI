import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setAnalyzing(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/analyze', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      setResults(res.data);
    } catch (err) {
      setError('Gagal menganalisis file. Pastikan format TXT benar dan tidak melebihi batas memori.');
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const COLORS = ['#38a169', '#e53e3e'];

  const getPieData = () => {
    if (!results) return [];
    return [
      { name: 'Sesuai Kompetensi', value: results.summary.patientsWithinCompetency },
      { name: 'Di Luar Kompetensi', value: results.summary.patientsOutsideCompetency }
    ];
  };

  const getBarData = () => {
    if (!results) return [];
    const stats = results.competencyStats;
    return Object.keys(stats).map(key => ({
      name: key.length > 20 ? key.substring(0, 20) + '...' : key,
      fullName: key,
      Jumlah: stats[key]
    })).sort((a, b) => b.Jumlah - a.Jumlah).slice(0, 10); // Top 10
  };

  return (
    <div>
      <h1 className="page-title">Dashboard Analisis Klaim</h1>
      
      {!results && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Unggah Data TXT INACBG</h2>
          </div>
          <div className="dropzone" onClick={() => document.getElementById('fileUpload').click()}>
            <UploadCloud className="dropzone-icon" />
            <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Klik atau Drag file TXT ke sini</h3>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>Maksimal ukuran file disarankan &lt; 50MB</p>
            <input 
              id="fileUpload" 
              type="file" 
              accept=".TXT,.txt" 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
            />
            {file && <div style={{ marginTop: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>File terpilih: {file.name}</div>}
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button className="btn-primary" onClick={handleUpload} disabled={!file || analyzing} style={{ padding: '0.75rem 2rem', fontSize: '1.1rem' }}>
              {analyzing ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'white' }}></span> Menganalisis...
                </span>
              ) : 'Mulai Analisis'}
            </button>
            {error && <p style={{ color: 'var(--danger)', marginTop: '1rem' }}>{error}</p>}
          </div>
        </div>
      )}

      {results && (
        <div className="results-container fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Ringkasan Hasil Analisis</h2>
            <button className="btn-outline" onClick={() => { setResults(null); setFile(null); }}>
              Analisis Ulang File Baru
            </button>
          </div>

          <div className="grid-3">
            <div className="card stat-card">
              <div className="stat-icon"><Users /></div>
              <div className="stat-info">
                <h3>Total Pasien</h3>
                <p>{results.summary.totalPatients.toLocaleString()}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" style={{ color: 'var(--success)', background: 'rgba(56, 161, 105, 0.1)' }}><CheckCircle /></div>
              <div className="stat-info">
                <h3>Sesuai Kompetensi</h3>
                <p>{results.summary.patientsWithinCompetency.toLocaleString()}</p>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat-icon" style={{ color: 'var(--danger)', background: 'rgba(229, 62, 62, 0.1)' }}><AlertTriangle /></div>
              <div className="stat-info">
                <h3>Di Luar Kompetensi</h3>
                <p>{results.summary.patientsOutsideCompetency.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid-3" style={{ gridTemplateColumns: '1fr 2fr' }}>
            <div className="card">
              <div className="card-header"><h2 className="card-title">Proporsi Kompetensi</h2></div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getPieData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getPieData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => value.toLocaleString()} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[0] }}></div> Sesuai
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: COLORS[1] }}></div> Di Luar Kompetensi
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h2 className="card-title">Top 10 Kompetensi yang Dibutuhkan</h2></div>
              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getBarData()} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="Jumlah" fill="var(--primary-light)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {results.anomalies.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Sample Kasus Di Luar Kompetensi (Anomali)</h2>
                <span className="badge badge-danger">Menampilkan maks 100 data</span>
              </div>
              <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>MRN</th>
                      <th>No SEP</th>
                      <th>Nama Pasien</th>
                      <th>Kode ICD</th>
                      <th>Kompetensi yang Kurang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.anomalies.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: '500' }}>{a.mrn}</td>
                        <td>{a.sep}</td>
                        <td>{a.nama}</td>
                        <td>
                           <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={a.diagnosa}>
                             {a.diagnosa}
                           </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {a.missingCompetencies.map(mc => (
                              <span key={mc} className="badge badge-danger">{mc}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
