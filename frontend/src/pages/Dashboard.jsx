import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Users, Activity, User, BarChart3, TrendingUp, TrendingDown,
  Zap, Search, Stethoscope, ClipboardList, ActivitySquare, Layers,
  Trash2, PlusCircle, RefreshCw, Upload
} from 'lucide-react';

export default function Dashboard() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('http://localhost:5000/api/analyze/latest', config);
      setResults(res.data);
      setError('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Belum ada data analisis. Silakan unggah file TXT terlebih dahulu.');
      } else if (err.response && err.response.status === 401) {
        setError('Sesi telah berakhir, silakan login kembali.');
      } else {
        setError('Gagal mengambil data: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const uploadRef = useRef(null);
  const appendRef = useRef(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    await uploadDirectly(file, false);
  };

  const uploadDirectly = async (targetFile, appendMode = false) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', targetFile);
    
    const savedSettings = localStorage.getItem('iDRG_RS_Config');
    if (savedSettings) {
      formData.append('rsConfig', savedSettings);
    }

    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const url = `http://localhost:5000/api/analyze${appendMode ? '?mode=append' : ''}`;
      const res = await axios.post(url, formData, config);
      setResults(res.data);
      setError('');
    } catch(err) {
      if (err.response && err.response.status === 401) {
        setError('Sesi Anda telah berakhir, silakan login kembali.');
      } else {
        setError('Gagal upload: ' + err.message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Yakin ingin menghapus semua data analisis dari memori server?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/analyze/clear', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(null);
      setError('Data telah dihapus. Silakan upload file baru.');
    } catch(err) {
      setError('Gagal menghapus data: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--primary)' }}>Memuat Dashboard Executive...</p>
        </div>
      </div>
    );
  }

  if (error || !results || !results.dashboard) {
    return (
      <div className="page-content" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '4rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <h2 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Integrasi Data Klaim</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error || 'Silakan unggah file TXT klaim RS untuk memulai analisis.'}</p>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <input type="file" accept=".txt" onChange={e => setFile(e.target.files[0])} style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '1rem', width: '100%', cursor: 'pointer' }} />
            <button type="submit" className="btn-primary" disabled={uploading || !file} style={{ width: '100%', padding: '1rem', borderRadius: '1rem', fontWeight: 900, letterSpacing: '1px' }}>
              {uploading ? 'MEMPROSES DATA...' : 'UNGGAH & ANALISIS'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const formatRp = (num, shrink = false) => {
    if (!num) return 'Rp 0';
    if (shrink) {
      if (Math.abs(num) >= 1e9) return `Rp ${(num / 1e9).toFixed(1)} M`;
      if (Math.abs(num) >= 1e6) return `Rp ${(num / 1e6).toFixed(1)} Jt`;
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };
  const formatPct = (num) => (num || 0).toFixed(1);

  const dashData = results.dashboard;
  const t = dashData.totalRows || 1;
  const isSelPos = dashData.selisihTotal >= 0;
  
  const rajalCount = t - (dashData.ranapCount || 0);
  const ranapPct = ((dashData.ranapCount || 0) / t) * 100;
  
  const selInaRS = dashData.tIna - dashData.tRs;
  const selIdrgRS = dashData.tIdrg - dashData.tRs;

  const insights = [
    selInaRS < 0
      ? { t: 'w', icon: '⚠️', txt: `INA-CBG lebih rendah dari Tarif RS sebesar ${formatRp(Math.abs(selInaRS))} — potensi defisit klaim.` }
      : { t: 's', icon: '✔', txt: `INA-CBG melebihi Tarif RS sebesar ${formatRp(selInaRS)} — klaim dalam posisi surplus.` },
    selIdrgRS < 0
      ? { t: 'w', icon: '⚠️', txt: `iDRG lebih rendah dari Tarif RS sebesar ${formatRp(Math.abs(selIdrgRS))} — evaluasi dokumentasi Klinis Diagnosa Sekunder diperlukan.` }
      : { t: 's', icon: '✔', txt: `iDRG melebihi Tarif RS sebesar ${formatRp(selIdrgRS)} — koding complexity level sudah optimal.` },
    { t: 'i', icon: '📊', txt: `${formatPct(dashData.tIna > 0 ? (dashData.cInaHigh / t) * 100 : 0)}% kasus INA > iDRG; ${formatPct(dashData.tIna > 0 ? (dashData.cIdrgHigh / t) * 100 : 0)}% kasus iDRG > INA.` },
    { t: 'i', icon: '🏥', txt: `Komposisi: ${formatPct(ranapPct)}% Rawat Inap (${(dashData.ranapCount || 0).toLocaleString()}) vs ${formatPct(100 - ranapPct)}% Rawat Jalan (${rajalCount.toLocaleString()} kasus).` }
  ];

  const dp = dashData.dischargeStats || {};
  const dischargePie = [
    { value: (dp["1"] / t) * 100, color: '#10b981', label: 'Atas Ijin Dokter' },
    { value: (dp["2"] / t) * 100, color: '#0d9488', label: 'Dirujuk' },
    { value: (dp["3"] / t) * 100, color: '#f97316', label: 'Pulang APS' },
    { value: (dp["4"] / t) * 100, color: '#e11d48', label: 'Meninggal' },
    { value: (dp["5"] / t) * 100, color: '#94a3b8', label: 'Lain-lain' }
  ];
  
  const selPie = [
    { value: t > 0 ? (dashData.cInaHigh / t) * 100 : 0, color: '#0d9488', label: 'INA > IDRG' },
    { value: t > 0 ? (dashData.cIdrgHigh / t) * 100 : 0, color: '#f97316', label: 'IDRG > INA' },
    { value: t > 0 ? (dashData.cEq / t) * 100 : 0, color: '#94a3b8', label: 'Sama Besar' }
  ];

  const renderDoughnut = (dataList) => {
    let offset = 0;
    return (
      <svg width="220" height="220" viewBox="0 0 42 42" style={{ filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.1))', transform: 'rotate(-90deg)' }}>
        <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6"></circle>
        {dataList.map((d, i) => {
           if (d.value <= 0) return null;
           const strokeDashoffset = 100 - offset;
           offset += d.value;
           return (
             <circle key={i} cx="21" cy="21" r="15.91549430918954" fill="transparent" 
               stroke={d.color} strokeWidth="6" 
               strokeDasharray={`${d.value} ${100 - d.value}`} 
               strokeDashoffset={strokeDashoffset} 
               style={{ transition: 'all 0.5s ease', cursor: 'pointer' }}
               className="hover:opacity-80"
             />
           );
        })}
      </svg>
    );
  };

  const MiniTable = ({ data, columns }) => (
    <div style={{ flex: 1, padding: '1rem', overflowX: 'auto' }}>
      <table className="mini-table">
        <thead>
          <tr>{columns.map((c, i) => <th key={i} className={c.className || ''}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? data.map((r, i) => (
            <tr key={i}>{columns.map((c, j) => <td key={j} className={c.className || ''}>{c.render(r, i)}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length} className="text-center">Tidak ada data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="page-content" style={{ maxWidth: '1600px', padding: '2rem' }}>
      
      {/* HEADER */}
      <div className="dash-header" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '0.75rem' }}>
            <PieChart size={32} />
          </div>
          <div>
            <h2 style={{ color: '#ffffff', fontSize: '1.75rem', margin: '0 0 0.25rem 0', fontWeight: 900 }}>Executive Dashboard</h2>
            <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 500 }}>Ringkasan eksekutif klaim klinis dan analisis profitabilitas.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Hidden inputs */}
          <input ref={uploadRef} type="file" accept=".txt" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) uploadDirectly(e.target.files[0], false); e.target.value = ''; }}
          />
          <input ref={appendRef} type="file" accept=".txt" style={{ display: 'none' }}
            onChange={(e) => { if (e.target.files[0]) uploadDirectly(e.target.files[0], true); e.target.value = ''; }}
          />

          {/* Tambah Data */}
          <button
            onClick={() => appendRef.current.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', border: '2px solid rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(6px)', transition: 'all 0.2s' }}
            title="Gabungkan file baru dengan data yang sudah ada"
          >
            <PlusCircle size={16} /> TAMBAH DATA
          </button>

          {/* Ganti Data */}
          <button
            onClick={() => uploadRef.current.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', border: 'none', backgroundColor: 'white', color: 'var(--primary)', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.15)', transition: 'all 0.2s' }}
            title="Ganti semua data dengan file baru"
          >
            {uploading ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> MEMPROSES...</> : <><Upload size={16} /> GANTI DATA</>}
          </button>

          {/* Hapus Data */}
          <button
            onClick={handleClear}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', border: '2px solid rgba(255,100,100,0.6)', backgroundColor: 'rgba(229,62,62,0.2)', color: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
            title="Hapus semua data dari memori server"
          >
            <Trash2 size={16} /> HAPUS DATA
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1.5rem' }}>
        {[
          { label: 'Total Kasus', value: t.toLocaleString(), sub: `${(dashData.ranapCount || 0).toLocaleString()} RI + ${rajalCount.toLocaleString()} RJ`, c: '#334155', icon: <Users size={16} /> },
          { label: 'Rawat Inap', value: (dashData.ranapCount || 0).toLocaleString(), sub: `${formatPct(ranapPct)}% dari total`, c: '#0d9488', icon: <Activity size={16} /> },
          { label: 'Rawat Jalan', value: rajalCount.toLocaleString(), sub: `${formatPct(100 - ranapPct)}% dari total`, c: '#10b981', icon: <User size={16} /> },
          { label: 'Rata-rata LOS', value: `${formatPct(dashData.avgLos)} Hari`, sub: 'Length of Stay', c: '#8b5cf6', icon: <Stethoscope size={16} /> },
          { label: 'Total Tarif RS', value: formatRp(dashData.tRs, true), sub: `Avg ${formatRp(dashData.tRs / t, true)}/ep`, c: '#94a3b8', icon: <BarChart3 size={16} /> },
          { label: 'Selisih INA-RS', value: (selInaRS >= 0 ? '+' : '') + formatRp(selInaRS, true), sub: selInaRS >= 0 ? 'Surplus' : 'Defisit', c: selInaRS >= 0 ? '#10b981' : '#e11d48', icon: <TrendingUp size={16} /> },
          { label: 'Selisih iDRG-RS', value: (selIdrgRS >= 0 ? '+' : '') + formatRp(selIdrgRS, true), sub: selIdrgRS >= 0 ? 'Surplus' : 'Defisit', c: selIdrgRS >= 0 ? '#10b981' : '#e11d48', icon: <TrendingUp size={16} /> },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-top-bar" style={{ backgroundColor: k.c }}></div>
            <div className="kpi-icon-box" style={{ backgroundColor: k.c }}>{k.icon}</div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* INSIGHTS */}
      <div className="insight-block">
        <div className="insight-header">
          <Zap size={24} />
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'white' }}>Insight Analisis Otomatis</h3>
            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px' }}>Temuan Kunci dari Efisiensi Koding</p>
          </div>
        </div>
        <div className="insight-body">
          <div className="insight-grid">
            {insights.map((ins, i) => (
              <div key={i} className="insight-item">
                <div className="insight-line" style={{ backgroundColor: ins.t === 'w' ? '#e11d48' : ins.t === 's' ? '#10b981' : '#0d9488' }}></div>
                <div className="insight-icon" style={{ backgroundColor: ins.t === 'w' ? '#ffe4e6' : ins.t === 's' ? '#d1fae5' : '#ccfbf1', color: ins.t === 'w' ? '#e11d48' : ins.t === 's' ? '#10b981' : '#0d9488' }}>
                  {ins.icon}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.5 }}>
                  {ins.txt}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BIG CARDS */}
      <div className="big-card-grid">
        <div className="big-card">
          <div className="kpi-top-bar" style={{ backgroundColor: '#0d9488' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total INA-CBG</span>
            <div style={{ backgroundColor: '#ccfbf1', padding: '0.5rem', borderRadius: '0.5rem', color: '#0d9488' }}><Search size={16} /></div>
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>{formatRp(dashData.tIna)}</h2>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', margin: '0.5rem 0 0 0', textTransform: 'uppercase' }}>Rata-rata {formatRp(dashData.rataIna)} per kasus</p>
        </div>
        
        <div className="big-card">
          <div className="kpi-top-bar" style={{ backgroundColor: '#0ea5e9' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total iDRG</span>
            <div style={{ backgroundColor: '#e0f2fe', padding: '0.5rem', borderRadius: '0.5rem', color: '#0ea5e9' }}><Search size={16} /></div>
          </div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#1e293b', margin: 0, wordBreak: 'break-word' }}>{formatRp(dashData.tIdrg)}</h2>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', margin: '0.5rem 0 0 0', textTransform: 'uppercase' }}>Rata-rata {formatRp(dashData.rataIdrg)} per kasus</p>
        </div>

        <div className="big-card">
          <div className="kpi-top-bar" style={{ backgroundColor: isSelPos ? '#10b981' : '#e11d48' }}></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Selisih Finansial Total (iDRG - INA)</span>
            <div style={{ backgroundColor: '#f1f5f9', padding: '0.5rem', borderRadius: '0.5rem', color: '#64748b' }}><Search size={16} /></div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 2vw, 2.5rem)', fontWeight: 900, color: isSelPos ? '#10b981' : '#e11d48', margin: 0, wordBreak: 'break-word' }}>
              {isSelPos ? '+' : ''}{formatRp(dashData.selisihTotal)}
            </h2>
            <div style={{ backgroundColor: isSelPos ? '#d1fae5' : '#ffe4e6', color: isSelPos ? '#047857' : '#be123c', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.75rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {isSelPos ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {formatPct(dashData.tIna > 0 ? (Math.abs(dashData.selisihTotal) / dashData.tIna * 100) : 0)}%
            </div>
          </div>
          <p style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', margin: '0.5rem 0 0 0', textTransform: 'uppercase' }}>Potensi {isSelPos ? 'Surplus' : 'Defisit'} terhadap klaim INA-CBG awal.</p>
        </div>
      </div>

      {/* SEVERITY & COMPLEXITY */}
      <div className="big-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#8b5cf6', borderRadius: '4px' }}></span>
            Analisis Tingkat Keparahan (Severity Level INA-CBG)
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <MiniTable data={[
              { level: 'Level 3 (Berat)', count: dashData.severityStats?.['3'] || 0, color: '#e11d48' },
              { level: 'Level 2 (Sedang)', count: dashData.severityStats?.['2'] || 0, color: '#f59e0b' },
              { level: 'Level 1 (Ringan)', count: dashData.severityStats?.['1'] || 0, color: '#3b82f6' },
              { level: 'Level 0 (Rawat Jalan)', count: dashData.severityStats?.['0'] || 0, color: '#10b981' }
            ].filter(x => x.count > 0)} columns={[
              { header: 'Tingkat Keparahan', className: 'font-black text-slate', render: r => (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: r.color }}></div>
                  {r.level}
                </div>
              ) },
              { header: 'Jumlah Kasus', className: 'text-right font-black text-slate', render: r => (r.count || 0).toLocaleString() }
            ]} />
          </div>
        </div>

        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#ec4899', borderRadius: '4px' }}></span>
            Analisis Kompleksitas (Complexity Level iDRG)
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
            <MiniTable data={Object.keys(dashData.complexityStats || {}).map(k => ({
              level: k,
              count: dashData.complexityStats[k]
            })).filter(x => x.count > 0).sort((a,b) => b.count - a.count)} columns={[
              { header: 'Tingkat Kompleksitas', className: 'font-black text-slate', render: r => r.level },
              { header: 'Jumlah Kasus', className: 'text-right font-black text-slate', render: r => (r.count || 0).toLocaleString() }
            ]} />
          </div>
        </div>
      </div>

      {/* MONTHLY CHART */}
      <div className="chart-card">
        <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart3 size={20} className="text-teal" /> Komparasi & Tren Bulanan
        </h3>
        
        <div className="chart-container">
          <div style={{ position: 'absolute', top: '65%', left: 0, right: 0, borderBottom: '1px dashed #cbd5e1', zIndex: 0 }}></div>
          
          {dashData.monthlyArray && dashData.monthlyArray.map((m, i) => {
             const isDef = m.selisih < 0;
             const maxV = Math.max(...dashData.monthlyArray.map(x => Math.max(x.tarifRs, x.inacbg, x.idrg))) || 1;
             const maxN = Math.max(...dashData.monthlyArray.map(x => Math.abs(x.selisih))) || 1;
             
             const hRs = Math.max((m.tarifRs / maxV) * 100, 1);
             const hIna = Math.max((m.inacbg / maxV) * 100, 1);
             const hIdrg = Math.max((m.idrg / maxV) * 100, 1);
             const hSelPos = !isDef ? Math.max((m.selisih / maxV) * 100, 1) : 0;
             const hSelNeg = isDef ? Math.max((Math.abs(m.selisih) / maxN) * 100, 1) : 0;
             
             return (
               <div key={i} className="chart-bar-group">
                 <div className="bar-tooltip">
                   <div style={{ fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>{m.label}</div>
                   <div>RS: {formatRp(m.tarifRs, true)}</div>
                   <div style={{ color: '#2dd4bf' }}>INA: {formatRp(m.inacbg, true)}</div>
                   <div style={{ color: '#fb7185' }}>iDRG: {formatRp(m.idrg, true)}</div>
                   <div style={{ color: isDef ? '#fb7185' : '#34d399', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                     {isDef ? 'Defisit' : 'Surplus'}: {formatRp(m.selisih, true)}
                   </div>
                 </div>
                 
                 <div className="chart-bar-pos" style={{ height: '65%' }}>
                   <div className="bar-part bg-slate" style={{ height: `${hRs}%`, borderRadius: '4px 4px 0 0' }}></div>
                   <div className="bar-part bg-teal" style={{ height: `${hIna}%`, borderRadius: '4px 4px 0 0', boxShadow: '0 0 10px rgba(13,148,136,0.3)' }}></div>
                   <div className="bar-part bg-rose" style={{ height: `${hIdrg}%`, borderRadius: '4px 4px 0 0', boxShadow: '0 0 10px rgba(225,29,72,0.3)' }}></div>
                   <div className="bar-part" style={{ height: `${hSelPos}%`, borderRadius: '4px 4px 0 0', backgroundColor: isDef ? 'transparent' : '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.3)' }}></div>
                 </div>
                 
                 <div className="chart-bar-neg" style={{ height: '35%' }}>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: `${hSelNeg}%`, borderRadius: '0 0 4px 4px', backgroundColor: !isDef ? 'transparent' : '#e11d48', boxShadow: '0 0 10px rgba(225,29,72,0.3)' }}></div>
                 </div>
                 
                 <div style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', marginTop: '1rem' }}>{m.label}</div>
               </div>
             );
          })}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
          {[
            { c: '#64748b', l: 'Tarif RS' }, { c: '#0d9488', l: 'INACBG' }, { c: '#e11d48', l: 'IDRG' },
            { c: '#10b981', l: 'Surplus' }, { c: '#e11d48', l: 'Defisit' }
          ].map((lg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: lg.c }}></div>
              <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{lg.l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* PIE CHARTS */}
      <div className="big-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        <div className="big-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%', textAlign: 'left', marginBottom: '2rem' }}>Volume Arah Selisih</h3>
          
          <div style={{ position: 'relative', width: '220px', height: '220px' }}>
            {renderDoughnut(selPie)}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>{t.toLocaleString()}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Kasus</span>
            </div>
          </div>
          
          <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', marginTop: '2rem', paddingTop: '1.5rem' }}>
            {selPie.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '0.75rem', marginBottom: '0.5rem', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }}></div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569' }}>{item.label}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 900, color: item.color, marginRight: '0.5rem' }}>{(item.value / 100 * t).toLocaleString()}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' }}>({formatPct(item.value)}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="big-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', width: '100%', textAlign: 'left', marginBottom: '2rem' }}>Status Cara Pulang</h3>
          
          <div style={{ position: 'relative', width: '220px', height: '220px' }}>
            {renderDoughnut(dischargePie)}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b' }}>{t.toLocaleString()}</span>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Pasien</span>
            </div>
          </div>
          
          <div style={{ width: '100%', borderTop: '1px solid #f1f5f9', marginTop: '2rem', paddingTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {dischargePie.map((item, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', borderRadius: '0.75rem', backgroundColor: 'rgba(248, 250, 252, 0.5)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: item.color }}></div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 900, color: item.color }}>{formatPct(item.value)}%</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#94a3b8', marginLeft: '0.25rem' }}>({(item.value / 100 * t).toLocaleString()})</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* TOP 10 TABLES SECTION 1 */}
      <div style={{ textAlign: 'center', marginTop: '4rem', marginBottom: '2rem' }}>
        <div style={{ width: '48px', height: '48px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Layers size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Top 10 Analisis Klinis & Finansial</h2>
      </div>

      {/* OLD TABLES REMOVED - now in new card grid below */}

      {/* TOP 10 TABLES SECTION 2 */}
      <div className="big-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))' }}>
        {/* INA SURPLUS */}
        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#10b981', borderRadius: '4px' }}></span>
            Top 10 Surplus INA-CBG
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
          <MiniTable data={dashData.topSurplusIna} columns={[
            { header: 'Kode & Deskripsi', className: 'font-black text-slate', render: r => (
              <div>
                <div style={{color: '#1e293b'}}>{r.code || '-'}</div>
                <div style={{fontSize: '0.65rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}} title={r.desc}>{r.desc || '-'}</div>
              </div>
            ) },
            { header: 'Kss', className: 'text-center font-black', render: r => r.count },
            { header: 'Selisih', className: 'text-right font-black text-emerald', render: r => '+' + formatRp(r.selisihVsRs) }
          ]} />
          </div>
        </div>

        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#e11d48', borderRadius: '4px' }}></span>
            Top 10 Defisit INA-CBG
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
          <MiniTable data={dashData.topDefisitIna} columns={[
            { header: 'Kode & Deskripsi', className: 'font-black text-slate', render: r => (
              <div>
                <div style={{color: '#1e293b'}}>{r.code || '-'}</div>
                <div style={{fontSize: '0.65rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}} title={r.desc}>{r.desc || '-'}</div>
              </div>
            ) },
            { header: 'Kss', className: 'text-center font-black', render: r => r.count },
            { header: 'Selisih', className: 'text-right font-black text-rose', render: r => '-' + formatRp(Math.abs(r.selisihVsRs)) }
          ]} />
          </div>
        </div>

        {/* IDRG SURPLUS */}
        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#0ea5e9', borderRadius: '4px' }}></span>
            Top 10 Surplus iDRG
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
          <MiniTable data={dashData.topSurplus} columns={[
            { header: 'Kode & Deskripsi', className: 'font-black text-slate', render: r => (
              <div>
                <div style={{color: '#1e293b'}}>{r.code || '-'}</div>
                <div style={{fontSize: '0.65rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}} title={r.desc}>{r.desc || '-'}</div>
              </div>
            ) },
            { header: 'Kss', className: 'text-center font-black', render: r => r.count },
            { header: 'Selisih', className: 'text-right font-black text-emerald', render: r => '+' + formatRp(r.selisihVsRs) }
          ]} />
          </div>
        </div>
        
        <div className="chart-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 900, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '24px', backgroundColor: '#f43f5e', borderRadius: '4px' }}></span>
            Top 10 Defisit iDRG
          </h3>
          <div style={{ flex: 1, overflowX: 'auto' }}>
          <MiniTable data={dashData.topDefisit} columns={[
            { header: 'Kode & Deskripsi', className: 'font-black text-slate', render: r => (
              <div>
                <div style={{color: '#1e293b'}}>{r.code || '-'}</div>
                <div style={{fontSize: '0.65rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px'}} title={r.desc}>{r.desc || '-'}</div>
              </div>
            ) },
            { header: 'Kss', className: 'text-center font-black', render: r => r.count },
            { header: 'Selisih', className: 'text-right font-black text-rose', render: r => '-' + formatRp(Math.abs(r.selisihVsRs)) }
          ]} />
          </div>
        </div>

      </div>
    </div>
  );
}
