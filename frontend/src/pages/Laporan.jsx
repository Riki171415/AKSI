import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { exportToExcel } from '../utils/exportUtils';
import { FileText, Download, Table as TableIcon, AlertCircle, TrendingUp, Activity, Layers, ActivitySquare, Ban, HelpCircle } from 'lucide-react';

export default function Laporan() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('inaCbg');

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
    if (!val) return '0';
    return Math.round(val).toLocaleString('id-ID');
  };

  const formatNumber = (val) => {
    if (!val) return '0';
    return Math.round(val).toLocaleString('id-ID');
  };

  const formatMonthIndo = (str) => {
    if (!str) return str;
    const parts = str.split('-');
    if (parts.length !== 2) return str;
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  const handleExportExcel = () => {
    if (!analysis || !analysis.reports) return;
    const r = analysis.reports;
    
    const inaCols = [
        { header: 'NO.', key: 'no', width: 5 },
        { header: 'BULAN', key: 'bulan', width: 20 },
        { header: 'SL 1 KASUS', key: 'sl1_c', width: 15 },
        { header: 'SL 1 TARIF', key: 'sl1_t', width: 20 },
        { header: 'SL 2 KASUS', key: 'sl2_c', width: 15 },
        { header: 'SL 2 TARIF', key: 'sl2_t', width: 20 },
        { header: 'SL 3 KASUS', key: 'sl3_c', width: 15 },
        { header: 'SL 3 TARIF', key: 'sl3_t', width: 20 },
        { header: 'TOTAL KASUS', key: 'tot_c', width: 15 },
        { header: 'TOTAL TARIF', key: 'tot_t', width: 20 }
    ];
    const inaData = r.inaCbg.map((d, i) => ({
        no: i + 1, bulan: d.monthKey,
        sl1_c: d.sl1_c, sl1_t: d.sl1_t,
        sl2_c: d.sl2_c, sl2_t: d.sl2_t,
        sl3_c: d.sl3_c, sl3_t: d.sl3_t,
        tot_c: d.total_c, tot_t: d.total_t
    }));

    const drgCols = [
        { header: 'NO.', key: 'no', width: 5 },
        { header: 'KODE DRG', key: 'drg', width: 15 },
        { header: 'DESKRIPSI DRG', key: 'desc', width: 40 },
        { header: 'JUMLAH KASUS', key: 'cases', width: 15 },
        { header: 'TOTAL TARIF RS', key: 'tRs', width: 20 },
        { header: 'TOTAL TARIF INA-CBGS', key: 'tIna', width: 20 },
        { header: 'TOTAL TARIF IDRG', key: 'tIdrg', width: 20 },
        { header: 'SELISIH (RS - INACBGS)', key: 's1', width: 25 },
        { header: 'SELISIH (RS - IDRG)', key: 's2', width: 25 },
        { header: 'SELISIH (IDRG - INACBGS)', key: 's3', width: 25 }
    ];
    const mapDrg = (d, i) => ({
        no: i + 1, drg: d.drgCode, desc: d.drgDesc, cases: d.cases,
        tRs: d.tRs, tIna: d.tIna, tIdrg: d.tIdrg,
        s1: d.tRs - d.tIna, s2: d.tRs - d.tIdrg, s3: d.tIdrg - d.tIna
    });

    const sheets = [
        { name: 'KLAIM INA-CBGS', columns: inaCols, data: inaData },
        { name: 'IDRG RAWAT INAP', columns: drgCols, data: r.idrg_ri.map(mapDrg) },
        { name: 'IDRG RAWAT JALAN', columns: drgCols, data: r.idrg_rj.map(mapDrg) }
    ];
    
    exportToExcel('Laporan_Standar_V5', sheets);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', fontWeight: 700, color: 'var(--text-muted)' }}>Memuat Data Laporan V5...</div>;
  }

  if (error || !analysis || !analysis.reports) {
    return (
      <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="var(--danger)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Data Belum Tersedia</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '500px', lineHeight: '1.5' }}>{error || 'Silakan unggah file TXT di halaman Dashboard Analisis terlebih dahulu.'}</p>
      </div>
    );
  }

  const r = analysis.reports;

  const renderInaCbg = () => (
    <div className="elite-table-container">
      <table className="elite-table">
        <thead>
          <tr>
            <th rowSpan="2">NO</th>
            <th rowSpan="2">BULAN LAYANAN</th>
            <th colSpan="4" className="text-center" style={{ backgroundColor: 'rgba(0, 177, 234, 0.05)', color: 'var(--primary)' }}>JUMLAH KASUS INA-CBGs</th>
            <th colSpan="4" className="text-center" style={{ backgroundColor: 'rgba(166, 177, 196, 0.1)', color: 'var(--text-main)' }}>JUMLAH KLAIM INA-CBGs (Rp)</th>
            <th rowSpan="2" className="text-center bg-success-light">TOTAL KASUS</th>
            <th rowSpan="2" className="text-center bg-success-light">TOTAL KLAIM (Rp)</th>
          </tr>
          <tr>
            <th className="text-center">SEVERITY LEVEL 0</th><th className="text-center">SEVERITY LEVEL 1</th><th className="text-center">SEVERITY LEVEL 2</th><th className="text-center">SEVERITY LEVEL 3</th>
            <th className="text-right">SEVERITY LEVEL 0</th><th className="text-right">SEVERITY LEVEL 1</th><th className="text-right">SEVERITY LEVEL 2</th><th className="text-right">SEVERITY LEVEL 3</th>
          </tr>
        </thead>
        <tbody>
          {r.inaCbg.map((d, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td className="font-black">{formatMonthIndo(d.monthKey)}</td>
              <td className="text-center">{formatNumber(d.sl0_c)}</td>
              <td className="text-center">{formatNumber(d.sl1_c)}</td>
              <td className="text-center">{formatNumber(d.sl2_c)}</td>
              <td className="text-center">{formatNumber(d.sl3_c)}</td>
              <td className="text-right">{formatRupiah(d.sl0_t)}</td>
              <td className="text-right">{formatRupiah(d.sl1_t)}</td>
              <td className="text-right">{formatRupiah(d.sl2_t)}</td>
              <td className="text-right">{formatRupiah(d.sl3_t)}</td>
              <td className="text-center font-black">{formatNumber(d.total_c)}</td>
              <td className="text-right font-black" style={{ color: 'var(--primary)' }}>{formatRupiah(d.total_t)}</td>
            </tr>
          ))}
          {r.inaCbg.length === 0 && <tr><td colSpan="12" className="text-center text-muted">Tidak ada data</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const renderIdrg = () => (
    <div className="elite-table-container">
      <table className="elite-table" style={{ minWidth: '1500px' }}>
        <thead>
          <tr>
            <th rowSpan="2">NO</th>
            <th rowSpan="2">BULAN LAYANAN</th>
            <th colSpan="4" className="text-center" style={{ backgroundColor: 'rgba(0, 177, 234, 0.05)', color: 'var(--primary)' }}>JUMLAH KASUS iDRG</th>
            <th colSpan="4" className="text-center" style={{ backgroundColor: 'rgba(166, 177, 196, 0.1)', color: 'var(--text-main)' }}>JUMLAH KLAIM iDRG (Rp)</th>
            <th rowSpan="2" className="text-center text-danger">Kasus Belum Mapping Kompetensi</th>
            <th rowSpan="2" className="text-center text-danger">Klaim Belum Mapping Kompetensi</th>
            <th colSpan="2" className="text-center bg-success-light">TOP - UP</th>
            <th rowSpan="2" className="text-center font-black">TOTAL KASUS</th>
          </tr>
          <tr>
            <th className="text-center">DASAR</th><th className="text-center">MADYA</th><th className="text-center">UTAMA</th><th className="text-center">PARIPURNA</th>
            <th className="text-right">DASAR</th><th className="text-right">MADYA</th><th className="text-right">UTAMA</th><th className="text-right">PARIPURNA</th>
            <th className="text-center">Kasus Top-Up</th><th className="text-right">Klaim Top-Up</th>
          </tr>
        </thead>
        <tbody>
          {r.idrg.map((d, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td className="font-black">{formatMonthIndo(d.monthKey)}</td>
              <td className="text-center">{formatNumber(d.d_c)}</td>
              <td className="text-center">{formatNumber(d.m_c)}</td>
              <td className="text-center">{formatNumber(d.u_c)}</td>
              <td className="text-center">{formatNumber(d.p_c)}</td>
              <td className="text-right">{formatRupiah(d.d_t)}</td>
              <td className="text-right">{formatRupiah(d.m_t)}</td>
              <td className="text-right">{formatRupiah(d.u_t)}</td>
              <td className="text-right">{formatRupiah(d.p_t)}</td>
              <td className="text-center font-black" style={{ color: 'var(--danger)' }}>{formatNumber(d.unmapped_c)}</td>
              <td className="text-right font-black" style={{ color: 'var(--danger)' }}>{formatRupiah(d.unmapped_t)}</td>
              <td className="text-center">{formatNumber(d.topup_c)}</td>
              <td className="text-right text-success">{formatRupiah(d.topup_t)}</td>
              <td className="text-center font-black">{formatNumber(d.total_c)}</td>
            </tr>
          ))}
          {r.idrg.length === 0 && <tr><td colSpan="15" className="text-center text-muted">Tidak ada data</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const renderDrgTable = (data, title) => {
    let sumKasus = 0, sumRs = 0, sumIna = 0, sumIdrg = 0;
    data.forEach(d => {
      sumKasus += d.cases; sumRs += d.tRs; sumIna += d.tIna; sumIdrg += d.tIdrg;
    });

    return (
      <div className="elite-table-container">
        <div style={{ padding: '1rem', fontWeight: 900, backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>{title}</div>
        <table className="elite-table">
          <thead>
            <tr>
              <th rowSpan="2">No.</th>
              <th rowSpan="2">Kode DRG</th>
              <th rowSpan="2">Deskripsi DRG</th>
              <th colSpan="4" className="text-center">Data Agregasi iDRG vs INA-CBG</th>
              <th colSpan="3" className="text-center bg-success-light">Selisih Margin</th>
            </tr>
            <tr>
              <th className="text-center">Jumlah Kasus</th>
              <th className="text-right">Total Tarif RS</th>
              <th className="text-right">Total Tarif INA-CBGs</th>
              <th className="text-right">Total Tarif iDRG</th>
              <th className="text-right">Selisih (RS - INACBGS)</th>
              <th className="text-right">Selisih (RS - iDRG)</th>
              <th className="text-right">Selisih (iDRG - INACBGS)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => (
              <tr key={i}>
                <td className="text-center">{i + 1}</td>
                <td className="font-black text-center">{d.drgCode}</td>
                <td style={{ maxWidth: '300px', whiteSpace: 'normal' }}>{d.drgDesc}</td>
                <td className="text-center">{formatNumber(d.cases)}</td>
                <td className="text-right text-muted">{formatRupiah(d.tRs)}</td>
                <td className="text-right">{formatRupiah(d.tIna)}</td>
                <td className="text-right font-black" style={{ color: 'var(--primary)' }}>{formatRupiah(d.tIdrg)}</td>
                <td className="text-right" style={{ color: (d.tRs - d.tIna) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatRupiah(d.tRs - d.tIna)}</td>
                <td className="text-right" style={{ color: (d.tRs - d.tIdrg) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatRupiah(d.tRs - d.tIdrg)}</td>
                <td className="text-right font-black" style={{ color: (d.tIdrg - d.tIna) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatRupiah(d.tIdrg - d.tIna)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3" className="font-black text-center" style={{ padding: '1rem' }}>TOTAL</td>
              <td className="text-center font-black">{formatNumber(sumKasus)}</td>
              <td className="text-right font-black">{formatRupiah(sumRs)}</td>
              <td className="text-right font-black">{formatRupiah(sumIna)}</td>
              <td className="text-right font-black" style={{ color: 'var(--primary)' }}>{formatRupiah(sumIdrg)}</td>
              <td className="text-right font-black">{formatRupiah(sumRs - sumIna)}</td>
              <td className="text-right font-black">{formatRupiah(sumRs - sumIdrg)}</td>
              <td className="text-right font-black">{formatRupiah(sumIdrg - sumIna)}</td>
            </tr>
          </tfoot>
        </table>
        <div style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Catatan: Data Pasien yang Ungroupable (iDRG) dieksklusi pada perhitungan tabel ini.
        </div>
      </div>
    );
  };

  const renderGabungan = () => (
    <div className="elite-table-container">
      <table className="elite-table" style={{ minWidth: '1400px' }}>
        <thead>
          <tr>
            <th rowSpan="3" className="text-center">NO</th>
            <th rowSpan="3" className="text-center">BULAN LAYANAN</th>
            <th colSpan="2" className="text-center" style={{ backgroundColor: 'rgba(166, 177, 196, 0.1)' }}>TARIF RS</th>
            <th colSpan="4" className="text-center" style={{ backgroundColor: 'rgba(0, 177, 234, 0.05)', color: 'var(--primary)' }}>KLAIM INA CBGs</th>
            <th colSpan="4" className="text-center bg-success-light">KLAIM iDRG</th>
            <th rowSpan="2" className="text-center text-danger">Data Ungroupable</th>
          </tr>
          <tr>
            <th rowSpan="2" className="text-right">RAJAL</th><th rowSpan="2" className="text-right">RANAP</th>
            <th colSpan="2" className="text-center">JUMLAH KASUS</th><th colSpan="2" className="text-center">JUMLAH KLAIM (Rp)</th>
            <th colSpan="2" className="text-center">JUMLAH KASUS</th><th colSpan="2" className="text-center">JUMLAH KLAIM (Rp)</th>
          </tr>
          <tr>
            <th className="text-center">RAJAL</th><th className="text-center">RANAP</th><th className="text-right">RAJAL</th><th className="text-right">RANAP</th>
            <th className="text-center">RAJAL</th><th className="text-center">RANAP</th><th className="text-right">RAJAL</th><th className="text-right">RANAP</th>
            <th className="text-center">Jumlah Kasus</th>
          </tr>
        </thead>
        <tbody>
          {r.gabungan.map((d, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td className="font-black text-center">{formatMonthIndo(d.monthKey)}</td>
              <td className="text-right text-muted">{formatRupiah(d.rj_tRs)}</td>
              <td className="text-right text-muted">{formatRupiah(d.ri_tRs)}</td>
              
              <td className="text-center">{formatNumber(d.inacbg_rj_c)}</td>
              <td className="text-center">{formatNumber(d.inacbg_ri_c)}</td>
              <td className="text-right">{formatRupiah(d.inacbg_rj_t)}</td>
              <td className="text-right">{formatRupiah(d.inacbg_ri_t)}</td>
              
              <td className="text-center font-black">{formatNumber(d.idrg_rj_c)}</td>
              <td className="text-center font-black">{formatNumber(d.idrg_ri_c)}</td>
              <td className="text-right font-black" style={{ color: 'var(--primary)' }}>{formatRupiah(d.idrg_rj_t)}</td>
              <td className="text-right font-black" style={{ color: 'var(--primary)' }}>{formatRupiah(d.idrg_ri_t)}</td>
              
              <td className="text-center font-black text-danger">{formatNumber(d.ungroup_c)}</td>
            </tr>
          ))}
          {r.gabungan.length === 0 && <tr><td colSpan="13" className="text-center text-muted">Tidak ada data</td></tr>}
        </tbody>
      </table>
    </div>
  );

  const renderSimpleList = (data, title) => (
    <div className="elite-table-container">
      <div style={{ padding: '1rem', fontWeight: 900, backgroundColor: 'var(--surface-alt)', borderBottom: '1px solid var(--border)' }}>{title}</div>
      <table className="elite-table">
        <thead>
          <tr>
            <th>No</th>
            <th>MRN</th>
            <th>SEP</th>
            <th>Nama Pasien</th>
            <th>Deskripsi / Kode DRG / INACBG</th>
            <th>Kode ICD</th>
            <th>Jenis Layanan</th>
            <th>Keterangan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td className="text-center">{i + 1}</td>
              <td>{d.mrn}</td>
              <td>{d.sep}</td>
              <td className="font-black">{d.nama}</td>
              <td>{d.desc}</td>
              <td style={{ color: 'var(--primary)', fontWeight: 700 }}>{d.icd}</td>
              <td className="text-center"><span className="badge" style={{ backgroundColor: 'var(--surface-alt)' }}>{d.type}</span></td>
              <td className="text-center"><span className="badge bg-danger-light">{d.ket}</span></td>
            </tr>
          ))}
          {data.length === 0 && <tr><td colSpan="8" className="text-center text-muted">Tidak ada kasus anomali ditemukan.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem', borderRadius: '12px' }}>
            <FileText size={28} />
          </div>
          <div>
            <h1 className="page-title" style={{ margin: 0, fontWeight: 900, fontStyle: 'italic', textTransform: 'uppercase' }}>
              Laporan <span style={{ color: 'var(--primary-light)' }}>Standar V5</span>
            </h1>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0.25rem 0 0 0' }}>
              Berdasarkan Template Excel Perbandingan INA CBGs dan I DRG
            </p>
          </div>
        </div>
        <button onClick={handleExportExcel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 900 }}>
          <Download size={16} /> Export Excel
        </button>
      </div>

      <div className="tab-container" style={{ flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <button onClick={() => setActiveTab('inaCbg')} className={`tab-button ${activeTab === 'inaCbg' ? 'active' : ''}`}>
          <TableIcon size={16} /> Klaim INA-CBGs
        </button>
        <button onClick={() => setActiveTab('idrg')} className={`tab-button ${activeTab === 'idrg' ? 'active' : ''}`}>
          <Activity size={16} /> Klaim iDRG
        </button>
        <button onClick={() => setActiveTab('idrgRi')} className={`tab-button ${activeTab === 'idrgRi' ? 'active' : ''}`}>
          <Layers size={16} /> iDRG RI
        </button>
        <button onClick={() => setActiveTab('idrgRj')} className={`tab-button ${activeTab === 'idrgRj' ? 'active' : ''}`}>
          <TrendingUp size={16} /> iDRG RJ
        </button>
        <button onClick={() => setActiveTab('gabungan')} className={`tab-button ${activeTab === 'gabungan' ? 'active' : ''}`}>
          <ActivitySquare size={16} /> Data Gabungan
        </button>
        <button onClick={() => setActiveTab('ungroupable')} className={`tab-button ${activeTab === 'ungroupable' ? 'active' : ''}`}>
          <Ban size={16} /> Kasus Ungroupable
        </button>
        <button onClick={() => setActiveTab('unmapped')} className={`tab-button ${activeTab === 'unmapped' ? 'active' : ''}`}>
          <HelpCircle size={16} /> Belum Ada Mapping
        </button>
      </div>

      <div className="card" style={{ padding: 0, border: 'none' }}>
        {activeTab === 'inaCbg' && renderInaCbg()}
        {activeTab === 'idrg' && renderIdrg()}
        {activeTab === 'idrgRi' && renderDrgTable(r.idrg_ri, 'iDRG RAWAT INAP')}
        {activeTab === 'idrgRj' && renderDrgTable(r.idrg_rj, 'iDRG RAWAT JALAN')}
        {activeTab === 'gabungan' && renderGabungan()}
        {activeTab === 'ungroupable' && renderSimpleList(r.ungroupable, 'KASUS UNGROUPABLE')}
        {activeTab === 'unmapped' && renderSimpleList(r.unmapped, 'KASUS BELUM ADA MAPPING KOMPETENSI')}
      </div>
    </div>
  );
}
