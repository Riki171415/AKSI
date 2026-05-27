import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Target, Activity, ActivitySquare, AlertCircle, Info, TrendingDown, ArrowUpRight, ChevronDown, ChevronUp, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Cell, PieChart, Pie, BarChart, Bar, Legend } from 'recharts';
import { exportToExcel, exportChartToPNG } from '../utils/exportUtils';
import PasswordModal from '../components/PasswordModal';

export default function Positioning() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    const fetchLatestAnalysis = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/analyze/latest', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAnalysis(res.data);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setError(err.response.data.message);
        } else {
          setError('Gagal mengambil data analisis terbaru dari server.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchLatestAnalysis();
  }, []);

  const formatRupiah = (val) => {
    if (!val) return 'Rp 0';
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  const formatRupiahShort = (val) => {
    if (!val) return '0';
    if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' Milyar';
    if (val >= 1000000) return (val / 1000000).toFixed(1) + ' Juta';
    return Math.round(val).toLocaleString('id-ID');
  };

  const formatNumber = (val) => {
    if (!val) return '0';
    return Math.round(val).toLocaleString('id-ID');
  };

  const scatterData = useMemo(() => {
    if (!analysis || !analysis.kelompokLayananData) return [];
    return analysis.kelompokLayananData.map(d => ({
      name: d.name,
      x: d.sesuai_c, // X = Volume Sesuai
      y: d.tidak_sesuai_c, // Y = Volume Tidak Sesuai
      cases: d.count,
      sesuai_t: d.sesuai_t,
      tidak_sesuai_t: d.tidak_sesuai_t
    })).filter(d => d.cases > 0);
  }, [analysis]);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Memuat Data Positioning...</div>;
  }

  if (error || !analysis) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Data Belum Tersedia</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.5' }}>{error || 'Silakan unggah file TXT di halaman Dashboard Analisis terlebih dahulu.'}</p>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'var(--surface)', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontWeight: 900, color: 'var(--primary)' }}>{data.name}</p>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <p style={{ margin: '0.25rem 0' }}>Total Kasus: <strong style={{ color: 'var(--text-main)' }}>{formatNumber(data.cases)}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Sesuai Kompetensi: <strong className="text-success">{formatNumber(data.x)} Kasus</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Tidak Sesuai Kompetensi: <strong className="text-danger">{formatNumber(data.y)} Kasus</strong></p>
            <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)' }}>
              <p style={{ margin: '0.25rem 0' }}>Pendapatan RBK: <strong className="text-success">{formatRupiah(data.sesuai_t)}</strong></p>
              <p style={{ margin: '0.25rem 0' }}>Potensi Loss: <strong className="text-danger">{formatRupiah(data.tidak_sesuai_t)}</strong></p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate Insights
  let biggestLoss = null;
  let totalLoss = 0;
  let totalRev = 0;
  
  if (analysis.kelompokLayananData) {
    analysis.kelompokLayananData.forEach(d => {
      totalLoss += d.tidak_sesuai_t;
      totalRev += d.tInacbg;
      if (!biggestLoss || d.tidak_sesuai_t > biggestLoss.tidak_sesuai_t) {
        biggestLoss = d;
      }
    });
  }
  
  const lossPct = totalRev > 0 ? ((totalLoss / totalRev) * 100).toFixed(1) : 0;

  const handleExportExcel = (password) => {
    if (!analysis || !analysis.kelompokLayananData) return;
    const data = analysis.kelompokLayananData;
    
    const cols = [
        { header: 'KELOMPOK LAYANAN', key: 'name', width: 30 },
        { header: 'TOTAL KASUS', key: 'count', width: 15 },
        { header: 'SESUAI (KASUS)', key: 'sc', width: 15 },
        { header: 'SESUAI (TARIF INA)', key: 'stina', width: 20 },
        { header: 'SESUAI (PENDAPATAN iDRG)', key: 'stidrg', width: 20 },
        { header: 'TIDAK SESUAI (KASUS)', key: 'tsc', width: 15 },
        { header: 'TIDAK SESUAI (TARIF INA)', key: 'tstina', width: 20 },
        { header: 'POTENSI LOSS (iDRG)', key: 'tstidrg', width: 20 }
    ];
    
    const rows = data.map(d => ({
        name: d.name, count: d.count,
        sc: d.sesuai_c, stina: d.sesuai_ina, stidrg: d.sesuai_t,
        tsc: d.tidak_sesuai_c, tstina: d.tidak_sesuai_ina, tstidrg: d.tidak_sesuai_t
    }));

    exportToExcel('Positioning_RS', [
        { name: 'POSITIONING', columns: cols, data: rows, chartElementId: 'positioning-scatter-chart' }
    ], password);
  };

  let sumTIna = 0;
  let sumTIdrg = 0;
  let sumSesuaiC = 0;
  let sumSesuaiIna = 0;
  let sumSesuaiT = 0;
  let sumTidakSesuaiC = 0;
  let sumTidakSesuaiIna = 0;
  let sumTidakSesuaiT = 0;

  analysis.kelompokLayananData?.forEach(r => {
      sumTIna += r.tInacbg || 0;
      sumTIdrg += (r.sesuai_t + r.tidak_sesuai_t) || 0;
      sumSesuaiC += r.sesuai_c || 0;
      sumSesuaiIna += r.sesuai_ina || 0;
      sumSesuaiT += r.sesuai_t || 0;
      sumTidakSesuaiC += r.tidak_sesuai_c || 0;
      sumTidakSesuaiIna += r.tidak_sesuai_ina || 0;
      sumTidakSesuaiT += r.tidak_sesuai_t || 0;
  });

  const totalAmanC = sumSesuaiC;
  const totalRisikoC = sumTidakSesuaiC;
  const totalKasus = totalAmanC + totalRisikoC;
  const rasioKepatuhan = totalKasus > 0 ? (totalAmanC / totalKasus) * 100 : 0;

  const top10Risiko = [...(analysis.kelompokLayananData || [])]
    .sort((a, b) => b.tidak_sesuai_c - a.tidak_sesuai_c)
    .slice(0, 10)
    .map(d => ({
      name: d.name.length > 25 ? d.name.substring(0, 25) + '...' : d.name,
      Sesuai: d.sesuai_c,
      Risiko: d.tidak_sesuai_c
    }));

  const donutRisikoData = [
    { name: 'Total Aman', value: totalAmanC, color: '#10b981' },
    { name: 'Potensi Tidak Terjamin', value: totalRisikoC, color: '#f43f5e' }
  ];

  return (
    <>
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
            <Target size={28} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
              Positioning <span style={{ color: 'var(--primary-light)' }}>RS</span>
            </h1>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.25rem 0 0 0' }}>
              Peta Kompetensi Layanan & Analisis Finansial
            </p>
          </div>
        </div>
        <button onClick={() => setShowPasswordModal(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 900 }}>
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* TOP 3 CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Card 1: TOTAL AMAN */}
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #10b981', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>TOTAL AMAN (TERJAMIN)</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{totalAmanC.toLocaleString()}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#10b981' }}>Kasus</div>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>SESUAI:</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#10b981' }}>{totalAmanC.toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>DIBAWAH RS:</div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: '#0ea5e9' }}>-</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>TOTAL INA-CBG</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>{formatRupiah(sumSesuaiIna)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#10b981' }}>TOTAL IDRG</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>{formatRupiah(sumSesuaiT)}</div>
            </div>
          </div>
          <ShieldCheck size={160} color="#10b981" style={{ position: 'absolute', right: '-30px', bottom: '-20px', opacity: 0.05, zIndex: 0 }} />
        </div>

        {/* Card 2: POTENSI TIDAK TERJAMIN */}
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #e11d48', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(225, 29, 72, 0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>POTENSI TIDAK TERJAMIN</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#e11d48', letterSpacing: '-0.02em' }}>{totalRisikoC.toLocaleString()}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#e11d48' }}>Kasus</div>
          </div>
          
          <div style={{ display: 'inline-block', backgroundColor: '#ffe4e6', color: '#e11d48', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800, marginBottom: '2.3rem' }}>
            WARNING: Melebihi Kompetensi RS
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#94a3b8' }}>TOTAL INA-CBG</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#0f172a' }}>{formatRupiah(sumTidakSesuaiIna)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 900, color: '#e11d48' }}>TOTAL IDRG</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 900, color: '#e11d48' }}>{formatRupiah(sumTidakSesuaiT)}</div>
            </div>
          </div>
          <AlertTriangle size={160} color="#e11d48" style={{ position: 'absolute', right: '-30px', bottom: '-20px', opacity: 0.05, zIndex: 0 }} />
        </div>

        {/* Card 3: RASIO KEPATUHAN */}
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #0d9488', borderRadius: '16px', padding: '1.5rem', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 15px rgba(13, 148, 136, 0.1)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textTransform: 'uppercase' }}>RASIO KEPATUHAN (COMPLIANCE)</div>
          <div style={{ fontSize: '3rem', fontWeight: 900, color: '#0d9488', letterSpacing: '-0.02em', marginBottom: '1rem' }}>
            {rasioKepatuhan.toFixed(1)}%
          </div>
          
          <div style={{ width: '100%', backgroundColor: '#f1f5f9', height: '12px', borderRadius: '6px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
            <div style={{ width: `${rasioKepatuhan}%`, backgroundColor: '#0d9488', height: '100%', borderRadius: '6px' }}></div>
          </div>
          <Target size={200} color="#0d9488" style={{ position: 'absolute', right: '-40px', bottom: '-40px', opacity: 0.05, zIndex: 0 }} />
        </div>
      </div>

      {/* NEW CHARTS SECTION */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Donut Chart: Sebaran Risiko */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <PieChart size={18} color="#0d9488" /> SEBARAN RISIKO PENJAMINAN
          </h4>
          <div style={{ width: '100%', height: '300px', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutRisikoData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                  labelLine={true}
                >
                  {donutRisikoData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => value.toLocaleString() + ' Kasus'} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stacked Bar: Top 10 Unit Berisiko */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 900, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <ActivitySquare size={18} color="#e11d48" /> TOP 10 UNIT BERISIKO (OVER-CAPACITY)
          </h4>
          <div style={{ width: '100%', height: '300px', minWidth: 0, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10Risiko} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={150} stroke="#64748b" fontSize={11} fontWeight={700} />
                <Tooltip formatter={(value) => value.toLocaleString() + ' Kasus'} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="Sesuai" stackId="a" fill="#10b981" barSize={20} />
                <Bar dataKey="Risiko" stackId="a" fill="#f43f5e" barSize={20} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Scatter Plot: Sebaran Kasus (Sesuai vs Tidak Sesuai Kompetensi)</h3>
            <button onClick={() => exportChartToPNG('positioning-scatter-chart', 'Scatter_Positioning_RS')} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', padding: '0.4rem 0.75rem' }}>
              <Download size={14} /> Save PNG
            </button>
        </div>
        <div id="positioning-scatter-chart" style={{ width: '100%', height: '400px', backgroundColor: 'white', minWidth: 0, minHeight: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                type="number" 
                dataKey="x" 
                name="Volume Sesuai" 
                tickFormatter={(val) => formatNumber(val)}
                label={{ value: 'Volume Kasus Sesuai Kompetensi', position: 'insideBottom', offset: -10, fontWeight: 700 }} 
              />
              <YAxis 
                type="number" 
                dataKey="y" 
                name="Volume Tidak Sesuai" 
                tickFormatter={(val) => formatNumber(val)}
                label={{ value: 'Volume Kasus Tidak Sesuai (Loss)', angle: -90, position: 'insideLeft', offset: -40, fontWeight: 700 }} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Kompetensi" data={scatterData} fill="var(--primary)">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.y > entry.x ? 'var(--danger)' : 'var(--primary)'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
          *Titik berwarna merah menandakan kelompok layanan dengan volume kasus Tidak Sesuai lebih banyak daripada Sesuai Kompetensi.
        </p>
      </div>

      <div className="elite-table-container">
        <table className="elite-table">
          <thead>
            <tr>
              <th rowSpan="2" style={{ verticalAlign: 'middle' }}>24 Kompetensi Layanan</th>
              <th rowSpan="2" className="text-center" style={{ verticalAlign: 'middle' }}>Level Kompetensi RS</th>
              <th colSpan="2" className="text-center" style={{ backgroundColor: 'rgba(0, 177, 234, 0.05)', color: 'var(--primary)' }}>VOLUME KASUS</th>
              <th colSpan="6" className="text-center" style={{ backgroundColor: 'rgba(166, 177, 196, 0.1)', color: 'var(--text-main)' }}>ANALISIS FINANSIAL (RUPIAH)</th>
            </tr>
            <tr>
              <th className="text-center">Sesuai (RBK)</th>
              <th className="text-center">Tidak Sesuai</th>
              <th className="text-right">Pendapatan INA-CBG<br/>(Saat Ini)</th>
              <th className="text-right">Pendapatan Total iDRG<br/>(Saat Ini)</th>
              <th className="text-right">Pendapatan RBK<br/>(Sesuai INA-CBG)</th>
              <th className="text-right">Pendapatan RBK<br/>(Sesuai iDRG)</th>
              <th className="text-right">Potensi Loss<br/>(Tidak Sesuai INA-CBG)</th>
              <th className="text-right">Potensi Loss<br/>(Tidak Sesuai iDRG)</th>
            </tr>
          </thead>
          <tbody>
            {analysis.kelompokLayananData?.map((r, i) => {
              if (r.count === 0) return null;
              
              const pctSesuai = r.count > 0 ? ((r.sesuai_c / r.count) * 100).toFixed(1) : 0;
              const pctTidakSesuai = r.count > 0 ? ((r.tidak_sesuai_c / r.count) * 100).toFixed(1) : 0;

              return (
                <React.Fragment key={i}>
                  <tr 
                    onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                    style={{ cursor: 'pointer', backgroundColor: expandedRow === i ? 'rgba(0, 177, 234, 0.05)' : 'transparent', transition: 'background-color 0.2s' }}
                    className="hover-row"
                  >
                    <td className="font-black" style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {expandedRow === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {r.name}
                    </td>
                    <td className="text-center font-black" style={{ color: r.rsLevel === 'Belum Diatur' ? 'var(--text-muted)' : 'var(--primary-light)' }}>
                      {r.rsLevel}
                    </td>
                    <td className="text-center">
                      <span className="text-success font-black" style={{ fontSize: '1rem' }}>{formatNumber(r.sesuai_c)}</span>
                      <br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pctSesuai}%)</span>
                    </td>
                    <td className="text-center">
                      <span className="text-danger font-black" style={{ fontSize: '1rem' }}>{formatNumber(r.tidak_sesuai_c)}</span>
                      <br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pctTidakSesuai}%)</span>
                    </td>
                    <td className="text-right text-muted">{formatRupiah(r.tInacbg)}</td>
                    <td className="text-right text-muted">{formatRupiah(r.sesuai_t + r.tidak_sesuai_t)}</td>
                    <td className="text-right font-black text-success" style={{ backgroundColor: 'rgba(16,185,129,0.02)' }}>{formatRupiah(r.sesuai_ina)}</td>
                    <td className="text-right font-black text-success" style={{ backgroundColor: 'rgba(16,185,129,0.06)' }}>{formatRupiah(r.sesuai_t)}</td>
                    <td className="text-right font-black text-danger" style={{ backgroundColor: 'rgba(225,29,72,0.02)' }}>{formatRupiah(r.tidak_sesuai_ina)}</td>
                    <td className="text-right font-black text-danger" style={{ backgroundColor: 'rgba(225,29,72,0.06)' }}>{formatRupiah(r.tidak_sesuai_t)}</td>
                  </tr>
                  
                  {expandedRow === i && (
                    <tr>
                      <td colSpan="9" style={{ padding: 0, backgroundColor: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Rincian Kasus per Level Kompetensi</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                            {['DASAR', 'MADYA', 'UTAMA', 'PARIPURNA', 'BELUM_ADA_MAPPING'].map(lvl => {
                              const lvlData = r.comps[lvl];
                              if (!lvlData || lvlData.count === 0) return null;
                              return (
                                <div key={lvl} style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                    <h5 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{lvl === 'BELUM_ADA_MAPPING' ? 'BELUM MAPPING' : lvl}</h5>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                      {formatNumber(lvlData.count)} Kasus
                                    </span>
                                  </div>
                                  
                                  {lvlData.icds && lvlData.icds.length > 0 ? (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                      {lvlData.icds.map((icd, idx) => (
                                        <div key={idx} style={{ marginBottom: '0.75rem', fontSize: '0.8rem', borderLeft: `3px solid ${icd.isOutsideGroup ? '#e11d48' : '#10b981'}`, paddingLeft: '0.5rem' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <strong style={{ color: '#334155' }}>{icd.code}</strong>
                                            <span style={{ fontWeight: 800, color: icd.isOutsideGroup ? '#e11d48' : '#10b981' }}>{formatNumber(icd.count)} kss</span>
                                          </div>
                                          <div style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.25rem' }} title={icd.desc}>
                                            {icd.desc}
                                          </div>
                                          {icd.isOutsideGroup && icd.loss > 0 && (
                                            <div style={{ color: '#e11d48', fontSize: '0.7rem', fontWeight: 700 }}>
                                              Potensi Loss: {formatRupiah(icd.loss)}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Tidak ada data rincian ICD.</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="2" style={{ padding: '1.5rem 1rem' }}>TOTAL</td>
              <td className="text-center text-success font-black">{formatNumber(analysis.summary.patientsWithinCompetency)}</td>
              <td className="text-center text-danger font-black">{formatNumber(analysis.summary.patientsOutsideCompetency)}</td>
              <td className="text-right text-muted">{formatRupiah(sumTIna)}</td>
              <td className="text-right text-muted">{formatRupiah(sumTIdrg)}</td>
              <td className="text-right text-success font-black">{formatRupiah(sumSesuaiIna)}</td>
              <td className="text-right text-success font-black">{formatRupiah(sumSesuaiT)}</td>
              <td className="text-right text-danger font-black">{formatRupiah(sumTidakSesuaiIna)}</td>
              <td className="text-right text-danger font-black">{formatRupiah(sumTidakSesuaiT)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <PasswordModal
      isOpen={showPasswordModal}
      onClose={() => setShowPasswordModal(false)}
      onSuccess={handleExportExcel}
      fileName="Positioning RS.xlsx"
    />
    </>
  );
}
