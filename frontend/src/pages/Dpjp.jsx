import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Stethoscope, Info, ChevronDown, ChevronUp, AlertCircle, Search, Download } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from 'recharts';
import { exportToExcel } from '../utils/exportUtils';

export default function Dpjp() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    fetchLatestAnalysis();
  }, []);

  const formatRupiah = (val) => {
    if (!val) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val) => {
    if (!val) return '0';
    return new Intl.NumberFormat('id-ID').format(val);
  };

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p style={{ marginTop: '1rem', color: 'var(--primary)' }}>Memuat Data Kompetensi DPJP...</p>
        </div>
      </div>
    );
  }

  if (error || !analysis || !analysis.dpjpData) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Data Belum Tersedia</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.5' }}>{error}</p>
      </div>
    );
  }

  const dpjpList = analysis.dpjpData || [];
  
  // Filter by search
  const filteredDpjp = dpjpList.filter(d => {
    const searchTarget = (d.realName || d.name).toLowerCase();
    return searchTarget.includes(searchTerm.toLowerCase());
  });

  // Top 5 by Loss
  const topLoss = [...dpjpList]
    .filter(d => d.tidak_sesuai_t > 0)
    .sort((a,b) => b.tidak_sesuai_t - a.tidak_sesuai_t)
    .slice(0, 5);
    
  const totalLossAll = dpjpList.reduce((acc, curr) => acc + curr.tidak_sesuai_t, 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', color: 'white', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', minWidth: '250px' }}>
          <p style={{ margin: '0 0 0.75rem 0', fontWeight: 900, borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '0.5rem', color: '#38bdf8' }}>{label}</p>
          <div style={{ fontSize: '0.85rem' }}>
            <p style={{ margin: '0.25rem 0' }}>Total Kasus: <strong style={{ color: 'white' }}>{formatNumber(data.count)} Kasus</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Sesuai Kompetensi: <strong className="text-success">{formatNumber(data.sesuai_c)} Kasus</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Tidak Sesuai Kompetensi: <strong className="text-danger">{formatNumber(data.tidak_sesuai_c)} Kasus</strong></p>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />
            <p style={{ margin: '0.25rem 0' }}>Pendapatan INA-CBG: <strong style={{ color: '#cbd5e1' }}>{formatRupiah(data.sesuai_ina + data.tidak_sesuai_ina)}</strong></p>
            <p style={{ margin: '0.25rem 0' }}>Potensi Loss: <strong className="text-danger">{formatRupiah(data.tidak_sesuai_t)}</strong></p>
          </div>
        </div>
      );
    }
    return null;
  };

  const handleExportExcel = () => {
    if (!analysis || !analysis.dpjpData) return;
    const data = analysis.dpjpData;
    
    const cols = [
        { header: 'NAMA DPJP', key: 'name', width: 30 },
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

    exportToExcel('Kompetensi_DPJP', [
        { name: 'DPJP', columns: cols, data: rows }
    ]);
  };

  let sumTIna = 0;
  let sumTIdrg = 0;
  let sumSesuaiIna = 0;
  let sumSesuaiT = 0;
  let sumTidakSesuaiIna = 0;
  let sumTidakSesuaiT = 0;

  filteredDpjp.forEach(r => {
      sumTIna += (r.sesuai_ina + r.tidak_sesuai_ina) || 0;
      sumTIdrg += (r.sesuai_t + r.tidak_sesuai_t) || 0;
      sumSesuaiIna += r.sesuai_ina || 0;
      sumSesuaiT += r.sesuai_t || 0;
      sumTidakSesuaiIna += r.tidak_sesuai_ina || 0;
      sumTidakSesuaiT += r.tidak_sesuai_t || 0;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
            <Stethoscope size={28} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
              Kompetensi <span style={{ color: 'var(--primary-light)' }}>DPJP</span>
            </h1>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.25rem 0 0 0' }}>
              Analisis Kinerja dan Finansial per Dokter Penanggung Jawab
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Cari nama DPJP..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.9rem' }}
            />
          </div>
          <button onClick={handleExportExcel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 900 }}>
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>

      {topLoss.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem', backgroundColor: 'rgba(225, 29, 72, 0.05)', borderLeft: '4px solid var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertCircle size={24} color="var(--danger)" style={{ marginTop: '0.2rem' }} />
            <div style={{ width: '100%' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: 'var(--danger)' }}>Top 5 DPJP - Potensi Loss Terbesar</h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
                Total kerugian akibat kasus tidak sesuai kompetensi di seluruh DPJP mencapai <strong className="text-danger">{formatRupiah(totalLossAll)}</strong>. Berikut adalah penyumbang terbesar:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {topLoss.map((d, i) => (
                  <div key={i} style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(225, 29, 72, 0.2)' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>#{i+1}</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.5rem' }} title={d.name}>{d.name}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--danger)' }}>{formatRupiah(d.tidak_sesuai_t)}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Dari {formatNumber(d.tidak_sesuai_c)} Kasus Loss</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {dpjpList.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 800 }}>Distribusi Volume Kasus per DPJP (Top 15)</h3>
          <div style={{ width: '100%', height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dpjpList.slice(0, 15)} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 10, fill: 'var(--text-muted)', fontWeight: 600 }} />
                <YAxis tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 11, fill: 'var(--text-muted)', fontWeight: 600 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.8rem', fontWeight: 700 }} />
                <Bar dataKey="sesuai_c" name="Sesuai Kompetensi" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="tidak_sesuai_c" name="Tidak Sesuai" stackId="a" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="elite-table-container">
        <table className="elite-table">
          <thead>
            <tr>
              <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Nama DPJP</th>
              <th colSpan="3" className="text-center" style={{ backgroundColor: 'rgba(0, 177, 234, 0.05)', color: 'var(--primary)' }}>VOLUME KASUS</th>
              <th colSpan="6" className="text-center" style={{ backgroundColor: 'rgba(166, 177, 196, 0.1)', color: 'var(--text-main)' }}>ANALISIS FINANSIAL (RUPIAH)</th>
            </tr>
            <tr>
              <th className="text-center">Total</th>
              <th className="text-center">Sesuai</th>
              <th className="text-center">Tidak Sesuai</th>
              <th className="text-right">Pendapatan INA-CBG</th>
              <th className="text-right">Pendapatan Total iDRG</th>
              <th className="text-right">Pendapatan RBK<br/>(Sesuai INA-CBG)</th>
              <th className="text-right">Pendapatan RBK<br/>(Sesuai iDRG)</th>
              <th className="text-right">Potensi Loss<br/>(Tidak Sesuai INA-CBG)</th>
              <th className="text-right">Potensi Loss<br/>(Tidak Sesuai iDRG)</th>
            </tr>
          </thead>
          <tbody>
            {filteredDpjp.length === 0 ? (
              <tr>
                <td colSpan="9" className="text-center" style={{ padding: '2rem', color: 'var(--text-muted)' }}>
                  Tidak ada DPJP yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredDpjp.map((r, i) => {
                if (r.count === 0) return null;
                
                const pctSesuai = r.count > 0 ? ((r.sesuai_c / r.count) * 100).toFixed(1) : 0;
                const pctTidakSesuai = r.count > 0 ? ((r.tidak_sesuai_c / r.count) * 100).toFixed(1) : 0;
                
                const totalInacbg = r.sesuai_ina + r.tidak_sesuai_ina;

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
                      <td className="text-center font-black" style={{ color: 'var(--text-main)' }}>
                        {formatNumber(r.count)}
                      </td>
                      <td className="text-center">
                        <span className="text-success font-black" style={{ fontSize: '1rem' }}>{formatNumber(r.sesuai_c)}</span>
                        <br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pctSesuai}%)</span>
                      </td>
                      <td className="text-center">
                        <span className="text-danger font-black" style={{ fontSize: '1rem' }}>{formatNumber(r.tidak_sesuai_c)}</span>
                        <br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({pctTidakSesuai}%)</span>
                      </td>
                      <td className="text-right text-muted">{formatRupiah(totalInacbg)}</td>
                      <td className="text-right text-muted">{formatRupiah(r.sesuai_t + r.tidak_sesuai_t)}</td>
                      <td className="text-right font-black text-success" style={{ backgroundColor: 'rgba(16,185,129,0.02)' }}>{formatRupiah(r.sesuai_ina)}</td>
                      <td className="text-right font-black text-success" style={{ backgroundColor: 'rgba(16,185,129,0.06)' }}>{formatRupiah(r.sesuai_t)}</td>
                      <td className="text-right font-black text-danger" style={{ backgroundColor: 'rgba(225,29,72,0.02)' }}>{formatRupiah(r.tidak_sesuai_ina)}</td>
                      <td className="text-right font-black text-danger" style={{ backgroundColor: 'rgba(225,29,72,0.06)' }}>{formatRupiah(r.tidak_sesuai_t)}</td>
                    </tr>
                    
                    {expandedRow === i && (
                      <tr>
                        <td colSpan="9" style={{ padding: 0, backgroundColor: '#f8fafc', borderBottom: '2px solid var(--border)' }}>
                          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>Rincian Kelompok Layanan & Level Kompetensi</h4>
                            {Object.values(r.comps).sort((a,b) => {
                              if (a.name === "KASUS BELUM MAPPING") return 1;
                              if (b.name === "KASUS BELUM MAPPING") return -1;
                              return b.count - a.count;
                            }).length === 0 ? (
                              <p style={{ color: 'var(--text-muted)' }}>Tidak ada data kelompok layanan spesifik.</p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {Object.values(r.comps).sort((a,b) => {
                                  if (a.name === "KASUS BELUM MAPPING") return 1;
                                  if (b.name === "KASUS BELUM MAPPING") return -1;
                                  return b.count - a.count;
                                }).map((c, idx) => (
                                  <div key={idx} style={{ backgroundColor: 'white', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    
                                    {/* Header Kelompok Layanan */}
                                    <div style={{ padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <div>
                                        <h5 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{c.name}</h5>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                          Total: <strong style={{ color: 'var(--text-main)' }}>{formatNumber(c.count)} Kasus</strong>
                                        </div>
                                      </div>
                                      <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.8rem' }}>
                                          <span className="text-success" style={{ fontWeight: 700 }}>Sesuai: {formatNumber(c.sesuai_c)}</span> | <span className="text-danger" style={{ fontWeight: 700 }}>Tidak Sesuai: {formatNumber(c.tidak_sesuai_c)}</span>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--danger)', marginTop: '0.25rem' }}>
                                          Loss: {formatRupiah(c.tidak_sesuai_t)}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Grid Level (Dasar, Madya, Utama, Paripurna) */}
                                    <div style={{ padding: '1.5rem', backgroundColor: 'white' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                                        {['DASAR', 'MADYA', 'UTAMA', 'PARIPURNA', 'BELUM_ADA_MAPPING'].map(lvl => {
                                          if (!c.levels) return null;
                                          const lvlData = c.levels[lvl];
                                          if (!lvlData || lvlData.count === 0) return null;
                                          
                                          return (
                                            <div key={lvl} style={{ backgroundColor: '#fcfcfc', borderRadius: '8px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                                                <h6 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{lvl === 'BELUM_ADA_MAPPING' ? 'BELUM MAPPING' : lvl}</h6>
                                                <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                                                  {formatNumber(lvlData.count)} Kasus
                                                </span>
                                              </div>
                                              
                                              {lvlData.icds && lvlData.icds.length > 0 ? (
                                                <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                                  {lvlData.icds.map((icd, icdIdx) => (
                                                    <div key={icdIdx} style={{ marginBottom: '0.75rem', fontSize: '0.8rem', borderLeft: `3px solid ${icd.isOutsideGroup ? '#e11d48' : '#10b981'}`, paddingLeft: '0.5rem' }}>
                                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                        <strong style={{ color: '#334155' }}>{icd.code}</strong>
                                                        <span style={{ fontWeight: 800, color: icd.isOutsideGroup ? '#e11d48' : '#10b981' }}>{formatNumber(icd.count)} kss</span>
                                                      </div>
                                                      <div style={{ color: '#64748b', fontSize: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.25rem' }} title={icd.desc}>
                                                        {icd.desc}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              ) : (
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tidak ada data ICD</div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr>
              <td className="text-right font-black" style={{ padding: '1.5rem 1rem' }}>TOTAL (DARI PENCARIAN)</td>
              <td className="text-center text-primary font-black">{formatNumber(filteredDpjp.reduce((a,b) => a+b.count, 0))}</td>
              <td className="text-center text-success font-black">{formatNumber(filteredDpjp.reduce((a,b) => a+b.sesuai_c, 0))}</td>
              <td className="text-center text-danger font-black">{formatNumber(filteredDpjp.reduce((a,b) => a+b.tidak_sesuai_c, 0))}</td>
              <td className="text-right text-muted font-black">{formatRupiah(sumTIna)}</td>
              <td className="text-right text-muted font-black">{formatRupiah(sumTIdrg)}</td>
              <td className="text-right text-success font-black">{formatRupiah(sumSesuaiIna)}</td>
              <td className="text-right text-success font-black">{formatRupiah(sumSesuaiT)}</td>
              <td className="text-right text-danger font-black">{formatRupiah(sumTidakSesuaiIna)}</td>
              <td className="text-right text-danger font-black">{formatRupiah(sumTidakSesuaiT)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
