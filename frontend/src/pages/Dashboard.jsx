import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Users, Activity, User, BarChart3, TrendingUp, TrendingDown,
  Zap, Search, Stethoscope, ClipboardList, ActivitySquare, Layers,
  Trash2, PlusCircle, RefreshCw, Upload, Download, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { exportChartToPNG } from '../utils/exportUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell, PieChart as RePieChart, Pie } from 'recharts';

export default function Dashboard() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLatestAnalysis();
  }, []);

  const fetchLatestAnalysis = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get('/api/analyze/latest', config);
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
    if (!files || files.length === 0) return;
    await uploadDirectly(files, false);
  };

  const uploadDirectly = async (targetFiles, appendMode = false) => {
    setUploading(true);
    const savedSettings = localStorage.getItem('iDRG_RS_Config');
    
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      let finalRes = null;
      for (let i = 0; i < targetFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', targetFiles[i]);
        if (savedSettings) formData.append('rsConfig', savedSettings);
        
        const isAppend = appendMode || i > 0;
        const url = `/api/analyze${isAppend ? '?mode=append' : ''}`;
        finalRes = await axios.post(url, formData, config);
      }
      
      if (finalRes) {
          setResults(finalRes.data);
          setError('');
      }
    } catch(err) {
      if (err.response && err.response.status === 401) {
        setError('Sesi Anda telah berakhir, silakan login kembali.');
      } else {
        setError('Gagal upload: ' + err.message);
      }
    } finally {
      setUploading(false);
      setFiles([]);
      if (uploadRef.current) uploadRef.current.value = null;
    }
  };

  const handleClear = async () => {
    if (!window.confirm('Yakin ingin menghapus semua data analisis dari memori server?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete('/api/analyze/clear', {
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
            <input 
              type="file" 
              accept=".txt" 
              multiple 
              ref={uploadRef}
              onChange={e => setFiles(Array.from(e.target.files))} 
              style={{ padding: '1rem', border: '2px dashed var(--border)', borderRadius: '1rem', width: '100%', cursor: 'pointer' }} 
            />
            {files.length > 0 && <p style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{files.length} file(s) dipilih</p>}
            <button type="submit" className="btn-primary" disabled={uploading || files.length === 0} style={{ width: '100%', padding: '1rem', borderRadius: '1rem', fontWeight: 900, letterSpacing: '1px' }}>
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
  const selIdrgIna = dashData.tIdrg - dashData.tIna;

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

  const formatMonthIndo = (str) => {
    if (!str) return str;
    const parts = str.split('-');
    if (parts.length !== 2) return str;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

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

  // Kompetensi Layanan calculations
  const kompetensiSummary = results.summary || {};
  const tCompVol = (kompetensiSummary.patientsWithinCompetency || 0) + (kompetensiSummary.patientsOutsideCompetency || 0);
  const pctWithinVol = tCompVol > 0 ? (kompetensiSummary.patientsWithinCompetency / tCompVol) * 100 : 0;
  const pctOutsideVol = tCompVol > 0 ? (kompetensiSummary.patientsOutsideCompetency / tCompVol) * 100 : 0;
  
  let totalPotensiLoss = 0;
  let topLossGroups = [];
  
  if (results.kelompokLayananData) {
    const sortedByLoss = [...results.kelompokLayananData]
      .filter(d => d.tidak_sesuai_t > 0)
      .sort((a,b) => b.tidak_sesuai_t - a.tidak_sesuai_t);
      
    topLossGroups = sortedByLoss.slice(0, 5).map(d => ({
      name: d.name.length > 20 ? d.name.substring(0, 20) + '...' : d.name,
      fullName: d.name,
      Loss: d.tidak_sesuai_t,
      Volume: d.tidak_sesuai_c
    }));
    
    totalPotensiLoss = results.kelompokLayananData.reduce((acc, curr) => acc + curr.tidak_sesuai_t, 0);
  }

  const levelAgg = {
    DASAR: { count: 0, tIna: 0, tIdrg: 0, color: '#0d9488' },
    MADYA: { count: 0, tIna: 0, tIdrg: 0, color: '#38bdf8' },
    UTAMA: { count: 0, tIna: 0, tIdrg: 0, color: '#e11d48' },
    PARIPURNA: { count: 0, tIna: 0, tIdrg: 0, color: '#4f46e5' },
    BELUM_ADA_MAPPING: { count: 0, tIna: 0, tIdrg: 0, color: '#94a3b8' }
  };
  let totalCompVolAgg = 0;

  if (results?.kelompokLayananData) {
    results.kelompokLayananData.forEach(r => {
      if (r.comps) {
        Object.keys(levelAgg).forEach(k => {
           if (r.comps[k]) {
             levelAgg[k].count += r.comps[k].count || 0;
             levelAgg[k].tIna += r.comps[k].tIna || 0;
             levelAgg[k].tIdrg += r.comps[k].tIdrg || 0;
             totalCompVolAgg += r.comps[k].count || 0;
           }
        });
      }
    });
  }

  const donutLevelData = Object.keys(levelAgg)
    .filter(k => levelAgg[k].count > 0)
    .map(k => ({
      name: k.replace(/_/g, ' '),
      value: levelAgg[k].count,
      pct: totalCompVolAgg > 0 ? (levelAgg[k].count / totalCompVolAgg) * 100 : 0,
      color: levelAgg[k].color,
      tIna: levelAgg[k].tIna,
      tIdrg: levelAgg[k].tIdrg
    }));

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
    <div style={{ flex: 1, padding: '0.5rem', overflowX: 'auto' }}>
      <table className="premium-table">
        <thead>
          <tr>{columns.map((c, i) => <th key={i} className={c.className || ''}>{c.header}</th>)}</tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? data.map((r, i) => (
            <tr key={i}>{columns.map((c, j) => <td key={j} className={c.className || ''}>{c.render(r, i)}</td>)}</tr>
          )) : (
            <tr><td colSpan={columns.length} className="text-center" style={{padding: '2rem'}}>Tidak ada data</td></tr>
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

      {/* PREMIUM SCORECARDS (3x3 GRID) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        
        {/* ROW 1: Volumes (White Cards with subtle shadows) */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#f0fdfa', color: '#0d9488', padding: '0.5rem', borderRadius: '8px' }}><Users size={18} /></div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>TOTAL KLAIM TERDETEKSI</div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {t.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>SELURUH LAYANAN</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>Inbound Clinical Traffic</div>
          </div>
          <Users size={120} color="#f8fafc" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.8, zIndex: 0 }} />
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#f0f9ff', color: '#0284c7', padding: '0.5rem', borderRadius: '8px' }}><Activity size={18} /></div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>KASUS RAWAT INAP (RI)</div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {(dashData.ranapCount || 0).toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>ADMISSION CARE</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>High Maturity Cases</div>
          </div>
          <Activity size={120} color="#f8fafc" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.8, zIndex: 0 }} />
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#fff1f2', color: '#e11d48', padding: '0.5rem', borderRadius: '8px' }}><ActivitySquare size={18} /></div>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em' }}>KASUS RAWAT JALAN (RJ)</div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            {rajalCount.toLocaleString()}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#475569' }}>AMBULATORY CARE</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', fontWeight: 600 }}>Primary Care Traffic</div>
          </div>
          <ActivitySquare size={120} color="#f8fafc" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.8, zIndex: 0 }} />
        </div>

        {/* ROW 2: Revenues / Costs (White Cards with colored borders) */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderLeft: '6px solid #0d9488' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL TARIF INA-CBG</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            {formatRp(dashData.tIna)}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase' }}>EXISTING BILLING STANDARD</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderLeft: '6px solid #e11d48' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL TARIF IDRG</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#e11d48', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            {formatRp(dashData.tIdrg)}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#e11d48', textTransform: 'uppercase' }}>SIMULASI PROYEKSI IDRG</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', borderLeft: '6px solid #1e293b' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>TOTAL BIAYA RIIL RS</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word' }}>
            {formatRp(dashData.tRs)}
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>HOSPITAL ACTUAL COSTS</div>
        </div>

        {/* ROW 3: Margins & Variances (Solid Colored Cards) */}
        <div style={{ backgroundColor: '#0d9488', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(13,148,136,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>SELISIH INA-CBG VS RS</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word', position: 'relative', zIndex: 1 }}>
            {(selInaRS >= 0 ? '+' : '') + formatRp(selInaRS)}
          </div>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#ffffff', position: 'relative', zIndex: 1 }}>
            PERFORMA LABA RUGI AKTUAL
          </div>
          <TrendingUp size={120} color="#ffffff" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, zIndex: 0 }} />
        </div>

        <div style={{ backgroundColor: '#e11d48', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(225,29,72,0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>SELISIH IDRG VS RS</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word', position: 'relative', zIndex: 1 }}>
            {(selIdrgRS >= 0 ? '+' : '') + formatRp(selIdrgRS)}
          </div>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#ffffff', position: 'relative', zIndex: 1 }}>
            SIMULASI LABA RUGI iDRG
          </div>
          <Zap size={120} color="#ffffff" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, zIndex: 0 }} />
        </div>

        <div style={{ backgroundColor: '#0f172a', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 10px 25px rgba(15,23,42,0.5)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.8)', letterSpacing: '0.05em', marginBottom: '0.5rem', position: 'relative', zIndex: 1 }}>iDRG GAIN VS INA-CBG</div>
          <div style={{ fontSize: 'clamp(1.5rem, 2vw, 2rem)', fontWeight: 900, color: '#ffffff', marginBottom: '1rem', letterSpacing: '-0.02em', wordBreak: 'break-word', position: 'relative', zIndex: 1 }}>
            {(selIdrgIna >= 0 ? '+' : '') + formatRp(selIdrgIna)}
          </div>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, color: '#ffffff', position: 'relative', zIndex: 1 }}>
            POTENSI REVENUE SHIFT
          </div>
          <PieChart size={120} color="#ffffff" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.05, zIndex: 0 }} />
        </div>
      </div>

      {/* KOMPETENSI LAYANAN INTELLIGENCE */}
      <div className="chart-card" id="dashboard-kompetensi-chart" style={{ marginBottom: '2rem', padding: '2rem', backgroundColor: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.03)' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Kiri: Donut Chart Distribusi Kompetensi Overall */}
          <div style={{ backgroundColor: '#ffffff', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <PieChart size={18} color="#0d9488" /> DISTRIBUSI KOMPETENSI OVERALL
            </h4>
            <div style={{ width: '100%', height: '300px', minWidth: 0, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={donutLevelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, pct }) => `${name}: ${pct.toFixed(1)}%`}
                    labelLine={true}
                  >
                    {donutLevelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, props) => [`${value} Kasus (${props.payload.pct.toFixed(1)}%)`, name]} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Kanan: Clinical Snapshot Cards */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
               CLINICAL SNAPSHOT
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {donutLevelData.map((lvl, idx) => (
                <div key={idx} style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#64748b', textTransform: 'uppercase' }}>{lvl.name}</div>
                    <div style={{ backgroundColor: `${lvl.color}15`, color: lvl.color, padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800 }}>{lvl.pct.toFixed(1)}%</div>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '1rem' }}>
                    {lvl.value.toLocaleString()} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>Cases</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', paddingTop: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#94a3b8' }}>TOTAL INA-CBG</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1e293b' }}>{formatRp(lvl.tIna, true)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6rem', fontWeight: 900, color: '#0d9488' }}>TOTAL IDRG</div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0d9488' }}>{formatRp(lvl.tIdrg, true)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bawah: Insight & Top 5 Loss */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #f1f5f9' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {topLossGroups.length > 0 ? (
              <div style={{ backgroundColor: '#fff1f2', borderLeft: '4px solid #e11d48', padding: '1.25rem', borderRadius: '0 8px 8px 0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#be123c', fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ActivitySquare size={16} /> Insight Kebocoran Utama
                </h4>
                <p style={{ margin: 0, color: '#881337', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  <strong>{topLossGroups[0]?.name}</strong> menjadi penyumbang potensi loss terbesar dengan nilai <strong>{formatRp(topLossGroups[0]?.Loss)}</strong> dari {topLossGroups[0]?.Volume} kasus yang dilayani di luar level kompetensi RS. Disarankan evaluasi DPJP dan panduan rujukan khusus untuk kelompok layanan ini.
                </p>
              </div>
            ) : (
              <div style={{ backgroundColor: '#ecfdf5', borderLeft: '4px solid #10b981', padding: '1.25rem', borderRadius: '0 8px 8px 0' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#047857', fontSize: '0.9rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ActivitySquare size={16} /> Insight Kompetensi
                </h4>
                <p style={{ margin: 0, color: '#065f46', fontSize: '0.85rem', lineHeight: '1.6' }}>
                  Luar biasa! Tidak ada kasus yang dilayani di luar level kompetensi RS. Kinerja klinis sudah sangat optimal.
                </p>
              </div>
            )}
            
            <button onClick={() => exportChartToPNG('dashboard-kompetensi-chart', 'Kompetensi_Layanan')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', padding: '0.75rem 1rem', alignSelf: 'flex-start' }}>
              <Download size={14} /> EXPORT INSIGHT DASHBOARD
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', marginBottom: '1rem', textAlign: 'center', textTransform: 'uppercase' }}>Top 5 Potensi Loss Berdasarkan Kelompok Layanan (iDRG)</h4>
            <div style={{ flex: 1, minHeight: '200px', minWidth: 0 }}>
              {topLossGroups.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLossGroups} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <XAxis type="number" tickFormatter={(val) => `Rp ${(val/1000000).toFixed(0)}Jt`} stroke="#cbd5e1" fontSize={10} />
                    <YAxis type="category" dataKey="name" width={140} stroke="#64748b" fontSize={11} fontWeight={700} />
                    <Tooltip 
                      formatter={(value) => formatRp(value)} 
                      cursor={{fill: 'rgba(226, 232, 240, 0.4)'}}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Bar dataKey="Loss" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={24}>
                      {topLossGroups.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#e11d48' : '#fb7185'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic', fontSize: '0.9rem' }}>
                  Tidak ada potensi loss tercatat.
                </div>
              )}
            </div>
          </div>
          
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
      <div className="chart-card" id="dashboard-monthly-chart">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <BarChart3 size={20} className="text-teal" /> Komparasi & Tren Bulanan
            </h3>
            <button onClick={() => exportChartToPNG('dashboard-monthly-chart', 'Tren_Bulanan_Dashboard')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', padding: '0.4rem 0.75rem' }}>
              <Download size={14} /> Save PNG
            </button>
        </div>
        
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
             
             const shortNum = (num) => {
                 if (!num) return '';
                 const abs = Math.abs(num);
                 if (abs >= 1e9) return (num / 1e9).toFixed(1).replace(/\.0$/, '') + 'M';
                 if (abs >= 1e6) return (num / 1e6).toFixed(1).replace(/\.0$/, '') + 'Jt';
                 if (abs >= 1e3) return (num / 1e3).toFixed(0) + 'K';
                 return num.toString();
             };
               
             const lblStyle = { position: 'absolute', top: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.55rem', fontWeight: 900, color: '#64748b' };
             const lblNegStyle = { position: 'absolute', bottom: '-18px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.55rem', fontWeight: 900, color: '#e11d48' };
             
             return (
               <div key={i} className="chart-bar-group">
                 <div className="bar-tooltip">
                   <div style={{ fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.25rem', marginBottom: '0.25rem' }}>{formatMonthIndo(m.label)}</div>
                   <div>RS: {formatRp(m.tarifRs, true)}</div>
                   <div style={{ color: '#2dd4bf' }}>INA: {formatRp(m.inacbg, true)}</div>
                   <div style={{ color: '#fb7185' }}>iDRG: {formatRp(m.idrg, true)}</div>
                   <div style={{ color: isDef ? '#fb7185' : '#34d399', marginTop: '0.25rem', paddingTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                     {isDef ? 'Defisit' : 'Surplus'}: {formatRp(m.selisih, true)}
                   </div>
                 </div>
                 
                 <div className="chart-bar-pos" style={{ height: '65%' }}>
                   <div className="bar-part bg-slate" style={{ height: `${hRs}%`, borderRadius: '4px 4px 0 0', position: 'relative' }}>
                     {hRs > 5 && <span style={lblStyle}>{shortNum(m.tarifRs)}</span>}
                   </div>
                   <div className="bar-part bg-teal" style={{ height: `${hIna}%`, borderRadius: '4px 4px 0 0', boxShadow: '0 0 10px rgba(13,148,136,0.3)', position: 'relative' }}>
                     {hIna > 5 && <span style={lblStyle}>{shortNum(m.inacbg)}</span>}
                   </div>
                   <div className="bar-part bg-rose" style={{ height: `${hIdrg}%`, borderRadius: '4px 4px 0 0', boxShadow: '0 0 10px rgba(225,29,72,0.3)', position: 'relative' }}>
                     {hIdrg > 5 && <span style={lblStyle}>{shortNum(m.idrg)}</span>}
                   </div>
                   <div className="bar-part" style={{ height: `${hSelPos}%`, borderRadius: '4px 4px 0 0', backgroundColor: isDef ? 'transparent' : '#10b981', boxShadow: '0 0 10px rgba(16,185,129,0.3)', position: 'relative' }}>
                     {hSelPos > 5 && !isDef && <span style={{...lblStyle, color: '#10b981'}}>{shortNum(m.selisih)}</span>}
                   </div>
                 </div>
                 
                 <div className="chart-bar-neg" style={{ height: '35%' }}>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: '100%' }}></div>
                   <div className="bar-part" style={{ height: `${hSelNeg}%`, borderRadius: '0 0 4px 4px', backgroundColor: !isDef ? 'transparent' : '#e11d48', boxShadow: '0 0 10px rgba(225,29,72,0.3)', position: 'relative' }}>
                     {hSelNeg > 5 && isDef && <span style={lblNegStyle}>{shortNum(Math.abs(m.selisih))}</span>}
                   </div>
                 </div>
                 
                 <div style={{ textAlign: 'center', fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8', marginTop: '1rem' }}>{formatMonthIndo(m.label)}</div>
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

      {/* TOP 10 TABLES SECTION 1 */}
      <div style={{ textAlign: 'center', marginTop: '4rem', marginBottom: '2rem' }}>
        <div style={{ width: '48px', height: '48px', backgroundColor: '#ccfbf1', color: '#0d9488', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <Layers size={24} />
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e293b', margin: 0 }}>Top 10 Analisis Klinis & Finansial</h2>
      </div>
      {/* TOP 10 TABLES SECTION 2 */}
      <div className="big-card-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))' }}>
        {/* INA SURPLUS */}
        <div className="premium-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '50%' }}>
              <ArrowUpRight size={20} />
            </div>
            Top 10 Surplus INA-CBG
          </h3>
          <MiniTable data={dashData.topSurplusIna} columns={[
            { header: 'Peringkat & Deskripsi', className: 'text-left', render: (r, i) => (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>{i + 1}</span>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '0.85rem' }}>{r.code || '-'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={r.desc}>{r.desc || '-'}</div>
                </div>
              </div>
            ) },
            { header: 'Kasus', className: 'text-center', render: r => <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '1rem', fontSize: '0.75rem' }}>{r.count}</span> },
            { header: 'Total Tarif INA-CBG', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarif || 0, true) },
            { header: 'Total Tarif RS', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarifRs || 0, true) },
            { header: 'Selisih', className: 'text-right text-emerald', render: r => '+' + formatRp(r.selisihVsRs) }
          ]} />
        </div>

        <div className="premium-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'rgba(225, 29, 72, 0.1)', color: '#e11d48', borderRadius: '50%' }}>
              <ArrowDownRight size={20} />
            </div>
            Top 10 Defisit INA-CBG
          </h3>
          <MiniTable data={dashData.topDefisitIna} columns={[
            { header: 'Peringkat & Deskripsi', className: 'text-left', render: (r, i) => (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>{i + 1}</span>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '0.85rem' }}>{r.code || '-'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={r.desc}>{r.desc || '-'}</div>
                </div>
              </div>
            ) },
            { header: 'Kasus', className: 'text-center', render: r => <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '1rem', fontSize: '0.75rem' }}>{r.count}</span> },
            { header: 'Total Tarif INA-CBG', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarif, true) },
            { header: 'Total Tarif RS', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarifRs, true) },
            { header: 'Selisih', className: 'text-right text-rose', render: r => '-' + formatRp(Math.abs(r.selisihVsRs)) }
          ]} />
        </div>

        {/* IDRG SURPLUS */}
        <div className="premium-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderRadius: '50%' }}>
              <ArrowUpRight size={20} />
            </div>
            Top 10 Surplus iDRG
          </h3>
          <MiniTable data={dashData.topSurplus} columns={[
            { header: 'Peringkat & Deskripsi', className: 'text-left', render: (r, i) => (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>{i + 1}</span>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '0.85rem' }}>{r.code || '-'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={r.desc}>{r.desc || '-'}</div>
                </div>
              </div>
            ) },
            { header: 'Kasus', className: 'text-center', render: r => <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '1rem', fontSize: '0.75rem' }}>{r.count}</span> },
            { header: 'Total Tarif iDRG', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarif || 0, true) },
            { header: 'Total Tarif RS', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarifRs || 0, true) },
            { header: 'Selisih', className: 'text-right text-emerald', render: r => '+' + formatRp(r.selisihVsRs) }
          ]} />
        </div>
        
        <div className="premium-card">
          <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#1e293b', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: '50%' }}>
              <ArrowDownRight size={20} />
            </div>
            Top 10 Defisit iDRG
          </h3>
          <MiniTable data={dashData.topDefisit} columns={[
            { header: 'Peringkat & Deskripsi', className: 'text-left', render: (r, i) => (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`rank-badge ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>{i + 1}</span>
                <div>
                  <div style={{ color: '#0f172a', fontWeight: 900, fontSize: '0.85rem' }}>{r.code || '-'}</div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={r.desc}>{r.desc || '-'}</div>
                </div>
              </div>
            ) },
            { header: 'Kasus', className: 'text-center', render: r => <span style={{ padding: '0.25rem 0.75rem', backgroundColor: '#f1f5f9', borderRadius: '1rem', fontSize: '0.75rem' }}>{r.count}</span> },
            { header: 'Total Tarif iDRG', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarif || 0, true) },
            { header: 'Total Tarif RS', className: 'text-right font-bold text-slate', render: r => formatRp(r.totalTarifRs || 0, true) },
            { header: 'Selisih', className: 'text-right text-rose', render: r => '-' + formatRp(Math.abs(r.selisihVsRs)) }
          ]} />
        </div>
      </div>
    </div>
  );
}
