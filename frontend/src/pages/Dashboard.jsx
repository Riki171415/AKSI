import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, Users, CheckCircle, AlertTriangle, FileText, Download, Printer } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Helper Functions ---
const formatRupiah = (angka) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

const formatNumber = (angka) => {
  return new Intl.NumberFormat('id-ID').format(angka);
};

const formatPeriode = (p) => {
  if (!p || !p.includes('-')) return p;
  const [y, m] = p.split('-');
  if (y === "Unknown") return "Tidak Diketahui";
  const bulan = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const monthIndex = parseInt(m);
  return `${bulan[monthIndex] || m} - ${y}`;
};

const IdrgTable = ({ data }) => (
  <div className="elite-card overflow-x-auto shadow-xl mt-8">
    <div className="flex justify-between items-center p-4 bg-[var(--surface)] border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        <FileText className="text-[var(--primary)]" />
        <h2 className="text-lg font-bold m-0 text-[var(--primary)]">LAPORAN KLAIM BERDASARKAN KOMPETENSI</h2>
      </div>
      <div className="flex gap-2">
        <button className="btn-outline flex items-center gap-2 text-xs" onClick={() => window.print()}>
          <Printer size={14} /> Cetak
        </button>
      </div>
    </div>
    <table className="w-full text-xs text-left border-collapse">
      <thead className="bg-[#f8fafc] text-[var(--text-muted)]">
        <tr>
          <th rowSpan={2} className="p-3 border border-[var(--border)] text-center">NO</th>
          <th rowSpan={2} className="p-3 border border-[var(--border)] text-center min-w-[120px]">BULAN LAYANAN</th>
          <th colSpan={4} className="p-2 border border-[var(--border)] text-center bg-indigo-50 text-indigo-700">JUMLAH KASUS</th>
          <th colSpan={4} className="p-2 border border-[var(--border)] text-center bg-teal-50 text-teal-700">JUMLAH KLAIM (Rp)</th>
          <th rowSpan={2} className="p-3 border border-[var(--border)] text-center bg-slate-100 font-bold">TOTAL KASUS</th>
          <th rowSpan={2} className="p-3 border border-[var(--border)] text-right bg-slate-100 font-bold min-w-[130px]">TOTAL KLAIM (Rp)</th>
        </tr>
        <tr className="text-[10px] font-bold uppercase text-slate-500">
          <th className="p-2 border border-[var(--border)] text-center bg-indigo-50/50">DASAR</th>
          <th className="p-2 border border-[var(--border)] text-center bg-indigo-50/50">MADYA</th>
          <th className="p-2 border border-[var(--border)] text-center bg-indigo-50/50">UTAMA</th>
          <th className="p-2 border border-[var(--border)] text-center bg-indigo-50/50">PARIPURNA</th>
          <th className="p-2 border border-[var(--border)] text-right bg-teal-50/50">DASAR</th>
          <th className="p-2 border border-[var(--border)] text-right bg-teal-50/50">MADYA</th>
          <th className="p-2 border border-[var(--border)] text-right bg-teal-50/50">UTAMA</th>
          <th className="p-2 border border-[var(--border)] text-right bg-teal-50/50">PARIPURNA</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--border)]">
        {data.map((r, i) => (
          <tr key={i} className="hover:bg-slate-50 transition-colors">
            <td className="p-2 border border-[var(--border)] text-center font-bold text-[var(--text-muted)]">{i+1}</td>
            <td className="p-2 border border-[var(--border)] font-bold uppercase text-[var(--primary)]">{formatPeriode(r._id)}</td>
            <td className="p-2 border border-[var(--border)] text-center">{formatNumber(r.idrg_dasar_c)}</td>
            <td className="p-2 border border-[var(--border)] text-center">{formatNumber(r.idrg_madya_c)}</td>
            <td className="p-2 border border-[var(--border)] text-center">{formatNumber(r.idrg_utama_c)}</td>
            <td className="p-2 border border-[var(--border)] text-center">{formatNumber(r.idrg_pari_c)}</td>
            <td className="p-2 border border-[var(--border)] text-right">{formatRupiah(r.idrg_dasar_t)}</td>
            <td className="p-2 border border-[var(--border)] text-right">{formatRupiah(r.idrg_madya_t)}</td>
            <td className="p-2 border border-[var(--border)] text-right">{formatRupiah(r.idrg_utama_t)}</td>
            <td className="p-2 border border-[var(--border)] text-right">{formatRupiah(r.idrg_pari_t)}</td>
            <td className="p-2 border border-[var(--border)] text-center bg-slate-50 font-bold">
              {formatNumber(r.idrg_dasar_c + r.idrg_madya_c + r.idrg_utama_c + r.idrg_pari_c)}
            </td>
            <td className="p-2 border border-[var(--border)] text-right bg-slate-50 font-bold text-[var(--primary)]">
              {formatRupiah(r.idrg_dasar_t + r.idrg_madya_t + r.idrg_utama_t + r.idrg_pari_t)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

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
    })).sort((a, b) => b.Jumlah - a.Jumlah).slice(0, 10);
  };

  return (
    <div>
      <h1 className="page-title no-print">Dashboard Analisis Klaim</h1>
      
      {!results && (
        <div className="card no-print">
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
          <div className="flex justify-between items-center mb-6 no-print">
            <h2 style={{ margin: 0 }}>Ringkasan Hasil Analisis</h2>
            <button className="btn-outline" onClick={() => { setResults(null); setFile(null); }}>
              Analisis Ulang File Baru
            </button>
          </div>

          <div className="grid-3 no-print">
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

          <div className="grid-3 no-print" style={{ gridTemplateColumns: '1fr 2fr' }}>
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

          {/* New Reporting Table Component */}
          {results.reports && results.reports.length > 0 && (
            <div className="print-only-table">
               <IdrgTable data={results.reports} />
            </div>
          )}

          {results.anomalies.length > 0 && (
            <div className="card mt-8 no-print">
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
