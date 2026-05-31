// Browser-side TXT analyzer
// Ported from api/controllers/analysisController.js
// File is processed entirely in the browser - never uploaded to server

const STORAGE_KEY = 'aksi_analysis_result';

// ── CSV Loader ──────────────────────────────────────────────────────────────

let icdMap = null;
let icdDescMap = null;
let fallbackDict = null;

async function loadCSVData() {
  if (icdMap) return; // already loaded

  icdMap = new Map();
  icdDescMap = new Map();

  const levelValues = { Dasar: 1, Madya: 2, Utama: 3, Paripurna: 4 };

  try {
    const res = await fetch('/data/ICD Kompetensi Layanan.csv');
    const text = await res.text();
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
      if (!line.match(/^\d+;/)) continue;
      const parts = line.split(';');
      if (parts.length >= 6) {
        const groupName = parts[2].trim();
        const icdCode = parts[3].replace(/['"]/g, '').trim();
        const icdDesc = parts[4].replace(/['"]/g, '').trim();
        const levelRaw = parts[5].replace(/['"]/g, '').trim();
        const level = levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1).toLowerCase();
        const levelInt = levelValues[level] || 1;

        if (!icdMap.has(icdCode)) icdMap.set(icdCode, []);
        if (!icdDescMap.has(icdCode) && icdDesc) icdDescMap.set(icdCode, icdDesc);

        const existing = icdMap.get(icdCode);
        if (!existing.find(e => e.group === groupName)) {
          existing.push({ group: groupName, level, levelInt });
        }
      }
    }
  } catch (e) {
    console.error('Failed to load CSV:', e);
  }

  try {
    const res2 = await fetch('/data/icd_fallback.json');
    fallbackDict = await res2.json();
  } catch (e) {
    fallbackDict = {};
  }
}

export function getCompetencies() {
  if (!icdMap) return [];
  const set = new Set();
  for (const entries of icdMap.values()) {
    for (const e of entries) set.add(e.group);
  }
  return Array.from(set).sort();
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const parseTarif = (valStr) => {
  if (!valStr) return 0;
  let s = valStr.toString().trim().replace(/['"]/g, '');
  s = s.replace(/[,.]00$/, '').replace(/[,.]/g, '');
  return parseFloat(s) || 0;
};

const levelValues = {
  'Belum Ada Mapping': 0,
  Dasar: 1, Madya: 2, Utama: 3, Paripurna: 4
};

const maskName = (name) => {
  if (!name || name === 'Unknown') return 'Unknown';
  return name.split(' ').map(word => {
    if (word.length <= 2) return word;
    return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
  }).join(' ');
};

const normalizeDpjpName = (name) => {
  if (!name) return '';
  let n = name.toUpperCase();
  n = n.replace(/^(DR\.|DRG\.|DR|DRG|PROF\.|PROF)\s+/g, '');
  n = n.split(',')[0];
  n = n.replace(/\s+(SP\..*|M\.KES.*|MARS.*|M\.SC.*)$/g, '');
  n = n.replace(/\s+(DR|DRG)$/g, '');
  n = n.replace(/[.,\-']/g, ' ');
  return n.trim().replace(/\s+/g, ' ');
};

// ── Session Storage helpers ──────────────────────────────────────────────────

export function saveResult(result) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to save analysis result to sessionStorage:', e);
  }
}

export function loadResult() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function clearResult() {
  sessionStorage.removeItem(STORAGE_KEY);
}

// ── Main Analyzer ────────────────────────────────────────────────────────────

export async function analyzeTxtFile(file, myCompetencies = {}, appendMode = false, onProgress = null) {
  await loadCSVData();

  const competencies = getCompetencies();

  // Read file text
  const fileText = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file, 'UTF-8');
  });

  const lines = fileText.split(/\r?\n/);
  const totalLines = lines.length;

  // Core KPIs
  let totalPatients = 0, patientsWithinCompetency = 0, patientsOutsideCompetency = 0;
  let totalTarifInacbg = 0, tarifWithinCompetency = 0, tarifOutsideCompetency = 0;
  let gapAnomalies = [];

  let ranapCount = 0, totalTarifRs = 0, totalTarifIdrgRaw = 0;
  let cInaHigh = 0, cIdrgHigh = 0, cEq = 0;
  let dischargeStats = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };

  let diagUtamaFreq = {}, diagSekunderFreq = {}, procFreq = {};
  let idrgSurplus = {}, idrgDefisit = {}, dpjpMap = {}, inaSurplus = {}, inaDefisit = {};
  const severityStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
  const complexityStats = { 'Rawat Jalan': 0, 'No CC': 0, 'Mild CC': 0, 'Moderate CC': 0, 'Severe CC': 0, 'Catastrophic CC': 0, 'Merge CC': 0, 'Unknown': 0 };

  let mdcMap = {};
  competencies.forEach(c => {
    mdcMap[c] = {
      name: c, count: 0, tInacbg: 0, tIdrg: 0,
      sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
      tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
      comps: {
        BELUM_ADA_MAPPING: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
        DASAR: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
        MADYA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
        UTAMA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
        PARIPURNA: { count: 0, tIna: 0, tIdrg: 0, icds: {} }
      }
    };
  });

  let reports = {
    inaCbg: {}, idrg: {}, idrg_ri: {}, idrg_rj: {},
    gabungan: {}, ungroupable: [], unmapped: []
  };

  let isHeader = true;
  // BUG B FIX: Header indices cached once, not re-computed per row
  let diagIdx = -1, procIdx = -1, nameIdx = -1, mrnIdx = -1, sepIdx = -1;
  let dateIdx = -1, tarifIdx = -1, tarifRsIdx = -1, idrgTarifIdx = -1;
  let birthDateIdx = -1, sexIdx = -1, idrgMdcIdx = -1, idrgDrgCodeIdx = -1;
  let idrgDrgDescIdx = -1, idrgTopUpIdx = -1, inacbgDescIdx = -1, inacbgIdx = -1;
  let ptdIdx = -1, dischargeIdx = -1, dpjpIdx = -1;

  const detectHeaders = (hdrs) => {
    diagIdx        = hdrs.indexOf('DIAGLIST');
    procIdx        = hdrs.indexOf('PROCLIST');
    nameIdx        = hdrs.indexOf('NAMA_PASIEN');
    mrnIdx         = hdrs.indexOf('MRN');
    sepIdx         = hdrs.indexOf('SEP');
    dateIdx        = hdrs.indexOf('DISCHARGE_DATE');
    tarifIdx       = hdrs.indexOf('TOTAL_TARIF');
    tarifRsIdx     = hdrs.indexOf('TARIF_RS');
    idrgTarifIdx   = hdrs.indexOf('IDRG_TOTAL_TARIF');
    birthDateIdx   = hdrs.indexOf('BIRTH_DATE');
    sexIdx         = hdrs.indexOf('SEX');
    idrgMdcIdx     = hdrs.indexOf('IDRG_MDC_NUMBER');
    idrgDrgCodeIdx = hdrs.indexOf('IDRG_DRG_CODE');
    idrgDrgDescIdx = hdrs.indexOf('IDRG_DRG_DESCRIPTION');
    idrgTopUpIdx   = hdrs.indexOf('IDRG_TOP_UP');
    inacbgDescIdx  = hdrs.findIndex(h => h === 'INACBG_DESKRIPSI' || h === 'INACBG_DESCRIPTION' || (h.includes('INACBG') && h.toLowerCase().includes('desk')));
    inacbgIdx      = hdrs.findIndex(h => h.includes('INACBG') && h !== hdrs[inacbgDescIdx]);
    ptdIdx         = hdrs.indexOf('JENIS_RAWAT');
    if (ptdIdx === -1) ptdIdx = hdrs.indexOf('PTD');
    if (ptdIdx === -1) ptdIdx = hdrs.indexOf('PELAYANAN');
    dischargeIdx   = hdrs.indexOf('DISCHARGE_STATUS');
    if (dischargeIdx === -1) dischargeIdx = hdrs.indexOf('STATUS_PULANG');
    if (dischargeIdx === -1) dischargeIdx = hdrs.indexOf('CARA_PULANG');
    dpjpIdx = -1;
    for (let i = 0; i < hdrs.length; i++) {
      const h = hdrs[i].trim().toUpperCase();
      if (['DPJP','NAMA_DOKTER','NAMA DOKTER','DOKTER_PJ','DOKTER','NAMA_DPJP','DOKTER_DPJP'].includes(h)) {
        dpjpIdx = i; break;
      }
    }
  };

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    if (!line.trim()) continue;

    // Progress callback every 500 lines + yield to browser
    if (onProgress && lineIdx % 500 === 0) {
      onProgress(Math.round((lineIdx / totalLines) * 100));
      await new Promise(r => setTimeout(r, 0));
    }

    const columns = line.split('\t');

    if (isHeader) {
      const hdrs = columns.map(h => h.trim());
      detectHeaders(hdrs); // BUG B FIX: detect once
      isHeader = false;
      continue;
    }

    if (diagIdx === -1) continue;

    const diaglist = (columns[diagIdx] || '').split(';').map(s => s.trim()).filter(Boolean);
    const proclist = procIdx !== -1 ? (columns[procIdx] || '').split(';').map(s => s.trim()).filter(Boolean) : [];

    // Track frequency
    if (diaglist.length > 0) {
      diagUtamaFreq[diaglist[0]] = (diagUtamaFreq[diaglist[0]] || 0) + 1;
      for (let i = 1; i < diaglist.length; i++) {
        diagSekunderFreq[diaglist[i]] = (diagSekunderFreq[diaglist[i]] || 0) + 1;
      }
    }
    for (const p of proclist) procFreq[p] = (procFreq[p] || 0) + 1;

    const patientRaw = nameIdx !== -1 ? columns[nameIdx] : 'Unknown';
    const patientName = maskName((patientRaw || '').trim());
    const mrn = mrnIdx !== -1 ? (columns[mrnIdx] || 'Unknown') : 'Unknown';
    const sep = sepIdx !== -1 ? (columns[sepIdx] || 'Unknown') : 'Unknown';
    const mdcNum = idrgMdcIdx !== -1 ? (columns[idrgMdcIdx] || '') : '';
    const drgCode = idrgDrgCodeIdx !== -1 ? (columns[idrgDrgCodeIdx] || '') : '';
    const drgDesc = idrgDrgDescIdx !== -1 ? (columns[idrgDrgDescIdx] || '') : '';
    const topUp = idrgTopUpIdx !== -1 ? parseTarif(columns[idrgTopUpIdx]) : 0;

    let isBedah = false;
    if (drgCode && drgCode.length >= 4) {
      const digit34 = parseInt(drgCode.substring(2, 4));
      if (!isNaN(digit34) && digit34 >= 0 && digit34 <= 40) isBedah = true;
    }
    const typeLayanan = isBedah ? 'Bedah' : 'Non-Bedah';
    const isUngroupable = mdcNum === '36';

    const dateStr = dateIdx !== -1 ? (columns[dateIdx] || '') : '';
    let monthKey = 'Unknown';
    if (dateStr.includes('/')) {
      const p = dateStr.split('/');
      if (p.length >= 3) monthKey = p[2] + '-' + p[1];
    } else if (dateStr.includes('-')) {
      const p = dateStr.split('-');
      if (p.length >= 3) monthKey = p[0] + '-' + p[1];
    }

    const tarif      = parseTarif(tarifIdx !== -1 ? columns[tarifIdx] : '0');
    const tarifRs    = parseTarif(tarifRsIdx !== -1 ? columns[tarifRsIdx] : '0');
    const tarifIdrgRaw = idrgTarifIdx !== -1 ? parseTarif(columns[idrgTarifIdx]) : tarif;
    const birthDateStr = birthDateIdx !== -1 ? (columns[birthDateIdx] || '') : '';
    const sexVal       = sexIdx !== -1 ? (columns[sexIdx] || '') : '';

    let ageInDays = 999;
    if (birthDateStr && dateStr) {
      const parseDate = (dStr) => {
        if (!dStr) return null;
        if (dStr.includes('/')) { const p = dStr.split('/'); if (p.length >= 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`); }
        else if (dStr.includes('-')) return new Date(dStr);
        return null;
      };
      const bDate = parseDate(birthDateStr), dDate = parseDate(dateStr);
      if (bDate && dDate && !isNaN(bDate.getTime()) && !isNaN(dDate.getTime())) {
        ageInDays = Math.floor(Math.abs(dDate - bDate) / 86400000);
      }
    }

    const inacbgCode = inacbgIdx !== -1 && columns[inacbgIdx] ? columns[inacbgIdx].trim() : '';
    const inacbgDesc = inacbgDescIdx !== -1 ? (columns[inacbgDescIdx] || '') : '';
    const ptd = ptdIdx !== -1 ? (columns[ptdIdx] || '') : '';
    const isRI = ptd ? (ptd === '1' || ptd.toLowerCase().includes('inap')) : (inacbgCode ? !(inacbgCode.endsWith('-0') || inacbgCode.endsWith('0')) : true);

    const dStat = dischargeIdx !== -1 ? (columns[dischargeIdx] || '').trim() : '';
    if (['1', '2', '3', '4'].includes(dStat)) dischargeStats[dStat]++;
    else dischargeStats['5']++;

    const dpjpNameRaw = dpjpIdx !== -1 ? (columns[dpjpIdx] || '') : '';
    let dpjpRealName = dpjpNameRaw.trim() || 'Tidak Diketahui';
    if (['-', '', '*'].includes(dpjpRealName)) dpjpRealName = 'Tidak Diketahui';
    const dpjpKey = dpjpRealName !== 'Tidak Diketahui' ? normalizeDpjpName(dpjpRealName) : 'Tidak Diketahui';

    if (!dpjpMap[dpjpKey]) {
      dpjpMap[dpjpKey] = {
        name: dpjpRealName !== 'Tidak Diketahui' ? maskName(dpjpRealName) : 'Tidak Diketahui',
        realName: dpjpRealName, count: 0,
        sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
        tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
        comps: {}
      };
    }
    dpjpMap[dpjpKey].count++;

    if (isRI) ranapCount++;
    totalTarifRs += tarifRs;
    totalTarifIdrgRaw += tarifIdrgRaw;

    if (Math.round(tarif) > Math.round(tarifIdrgRaw)) cInaHigh++;
    else if (Math.round(tarifIdrgRaw) > Math.round(tarif)) cIdrgHigh++;
    else cEq++;

    if (inacbgCode) {
      const selisihIna = tarif - tarifRs;
      if (!inaSurplus[inacbgCode]) inaSurplus[inacbgCode] = { count: 0, selisihTotal: 0, desc: inacbgDesc, totalTarif: 0, totalTarifRs: 0 };
      if (!inaDefisit[inacbgCode]) inaDefisit[inacbgCode] = { count: 0, selisihTotal: 0, desc: inacbgDesc, totalTarif: 0, totalTarifRs: 0 };
      if (selisihIna >= 0) {
        inaSurplus[inacbgCode].count++; inaSurplus[inacbgCode].selisihTotal += selisihIna;
        inaSurplus[inacbgCode].totalTarif += tarif; inaSurplus[inacbgCode].totalTarifRs += tarifRs;
      } else {
        inaDefisit[inacbgCode].count++; inaDefisit[inacbgCode].selisihTotal += Math.abs(selisihIna);
        inaDefisit[inacbgCode].totalTarif += tarif; inaDefisit[inacbgCode].totalTarifRs += tarifRs;
      }
    }

    if (drgCode) {
      const selisihIdrg = tarifIdrgRaw - tarifRs;
      if (!idrgSurplus[drgCode]) idrgSurplus[drgCode] = { count: 0, selisihTotal: 0, desc: drgDesc, totalTarif: 0, totalTarifRs: 0 };
      if (!idrgDefisit[drgCode]) idrgDefisit[drgCode] = { count: 0, selisihTotal: 0, desc: drgDesc, totalTarif: 0, totalTarifRs: 0 };
      if (selisihIdrg >= 0) {
        idrgSurplus[drgCode].count++; idrgSurplus[drgCode].selisihTotal += selisihIdrg;
        idrgSurplus[drgCode].totalTarif += tarifIdrgRaw; idrgSurplus[drgCode].totalTarifRs += tarifRs;
      } else {
        idrgDefisit[drgCode].count++; idrgDefisit[drgCode].selisihTotal += Math.abs(selisihIdrg);
        idrgDefisit[drgCode].totalTarif += tarifIdrgRaw; idrgDefisit[drgCode].totalTarifRs += tarifRs;
      }
    }

    let severity = isRI ? 1 : 0;
    if (inacbgCode.endsWith('III')) severity = 3;
    else if (inacbgCode.endsWith('II')) severity = 2;
    else if (inacbgCode.endsWith('I') && isRI) severity = 1;
    severityStats[severity]++;

    let complexity = 'Rawat Jalan';
    if (isRI && drgCode) {
      const ld = drgCode.slice(-1);
      const cMap = { '0': 'No CC', '1': 'Mild CC', '2': 'Moderate CC', '3': 'Severe CC', '4': 'Catastrophic CC', '9': 'Merge CC' };
      complexity = cMap[ld] || 'Unknown';
    }
    if (complexityStats[complexity] !== undefined) complexityStats[complexity]++;
    else complexityStats['Unknown']++;

    // BUG A FIX: Track HIGHEST competency PER GROUP (not just single global highest)
    // Both diaglist AND proclist are checked for competency mapping
    const allIcds = [...diaglist, ...proclist];
    const groupHighestMap = new Map(); // group → { group, level, levelInt }

    for (const icd of allIcds) {
      const cleanIcd = icd.trim();
      if (!cleanIcd) continue;
      let needed = icdMap.get(cleanIcd) || icdMap.get(cleanIcd.replace('.', ''));
      if (!needed && cleanIcd.includes('.')) needed = icdMap.get(cleanIcd.split('.')[0]);
      if (!needed) continue;

      for (const n of needed) {
        const gNameLower = n.group.toLowerCase();
        // Exclude neonatus for patients ≥29 days
        if (gNameLower.includes('neonatus') && ageInDays >= 29) continue;
        // Exclude obgyn/kandungan for male patients
        if ((gNameLower.includes('obgyn') || gNameLower.includes('kandungan') || gNameLower.includes('obstetri')) && sexVal !== '2') continue;

        const existing = groupHighestMap.get(n.group);
        if (!existing || n.levelInt > existing.levelInt) {
          groupHighestMap.set(n.group, n);
        }
      }
    }

    // Build patientNeededCompetencies from ALL groups (not just highest overall)
    const patientNeededCompetencies = Array.from(groupHighestMap.values());
    const groupNamesForPatient = new Set(patientNeededCompetencies.map(c => c.group));

    const isUnmapped = !isUngroupable && patientNeededCompetencies.length === 0;

    if (isUnmapped) {
      const primaryIcd = diaglist.length > 0 ? diaglist[0] : (proclist.length > 0 ? proclist[0] : 'UNKNOWN');
      let desc = fallbackDict[primaryIcd];
      if (!desc && primaryIcd.includes('.')) desc = fallbackDict[primaryIcd.split('.')[0]];
      if (!desc) desc = 'Tidak ada deskripsi';
      patientNeededCompetencies.push({ code: primaryIcd, desc, group: 'KASUS BELUM MAPPING', level: 'Belum Ada Mapping', levelInt: 0 });
      groupNamesForPatient.add('KASUS BELUM MAPPING');
    }

    if (isUngroupable && reports.ungroupable.length < 500)
      reports.ungroupable.push({ mrn, sep, nama: patientName, desc: drgDesc || inacbgCode, icd: diaglist.join('; '), type: typeLayanan, ket: 'Ungroupable' });
    if (isUnmapped && reports.unmapped.length < 500)
      reports.unmapped.push({ mrn, sep, nama: patientName, desc: drgDesc || inacbgCode, icd: diaglist.join('; '), type: typeLayanan, ket: 'Belum Ada Mapping Kompetensi' });

    totalPatients++;
    totalTarifInacbg += tarif;

    const missingCompetencies = [];
    const missingSet = new Set();

    for (const gName of groupNamesForPatient) {
      let reqLevelStr = 'Belum Ada Mapping', reqLevelInt = 0;
      for (const reqComp of patientNeededCompetencies) {
        if (reqComp.group === gName && reqComp.levelInt > reqLevelInt) {
          reqLevelInt = reqComp.levelInt; reqLevelStr = reqComp.level;
        }
      }

      const rsLevelStr = myCompetencies[gName] || 'Belum Diatur';
      const rsLevelInt = rsLevelStr !== 'Belum Diatur' ? (levelValues[rsLevelStr] || 0) : 0;
      const isOutsideGroup = rsLevelInt < reqLevelInt;
      const finalTarifIdrgGroup = isOutsideGroup ? 0 : tarifIdrgRaw;
      const lossValueGroup = isOutsideGroup ? tarifIdrgRaw : 0;

      if (isOutsideGroup) {
        const msg = `${gName} (Butuh: ${reqLevelStr})`;
        if (!missingSet.has(msg)) { missingSet.add(msg); missingCompetencies.push(msg); }
      }

      if (!mdcMap[gName]) {
        mdcMap[gName] = {
          name: gName, count: 0, tInacbg: 0, tIdrg: 0,
          sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
          tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
          rsLevel: rsLevelStr,
          comps: {
            BELUM_ADA_MAPPING: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            DASAR: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            MADYA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            UTAMA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            PARIPURNA: { count: 0, tIna: 0, tIdrg: 0, icds: {} }
          }
        };
      }
      if (!mdcMap[gName].rsLevel) mdcMap[gName].rsLevel = rsLevelStr;
      mdcMap[gName].count++;
      mdcMap[gName].tInacbg += tarif;
      mdcMap[gName].tIdrg += finalTarifIdrgGroup;

      if (isOutsideGroup) {
        mdcMap[gName].tidak_sesuai_c++; mdcMap[gName].tidak_sesuai_t += tarifIdrgRaw; mdcMap[gName].tidak_sesuai_ina += tarif;
        dpjpMap[dpjpKey].tidak_sesuai_c++; dpjpMap[dpjpKey].tidak_sesuai_t += tarifIdrgRaw; dpjpMap[dpjpKey].tidak_sesuai_ina += tarif;
      } else {
        mdcMap[gName].sesuai_c++; mdcMap[gName].sesuai_t += tarifIdrgRaw; mdcMap[gName].sesuai_ina += tarif;
        dpjpMap[dpjpKey].sesuai_c++; dpjpMap[dpjpKey].sesuai_t += tarifIdrgRaw; dpjpMap[dpjpKey].sesuai_ina += tarif;
      }

      if (!dpjpMap[dpjpKey].comps[gName]) {
        dpjpMap[dpjpKey].comps[gName] = {
          name: gName, count: 0,
          sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
          tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
          levels: {
            BELUM_ADA_MAPPING: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            DASAR: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            MADYA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            UTAMA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
            PARIPURNA: { count: 0, tIna: 0, tIdrg: 0, icds: {} }
          }
        };
      }
      dpjpMap[dpjpKey].comps[gName].count++;
      if (isOutsideGroup) {
        dpjpMap[dpjpKey].comps[gName].tidak_sesuai_c++; dpjpMap[dpjpKey].comps[gName].tidak_sesuai_t += tarifIdrgRaw; dpjpMap[dpjpKey].comps[gName].tidak_sesuai_ina += tarif;
      } else {
        dpjpMap[dpjpKey].comps[gName].sesuai_c++; dpjpMap[dpjpKey].comps[gName].sesuai_t += tarifIdrgRaw; dpjpMap[dpjpKey].comps[gName].sesuai_ina += tarif;
      }

      const lvlUpper = reqLevelStr.toUpperCase().replace(/ /g, '_');
      if (mdcMap[gName].comps[lvlUpper]) {
        mdcMap[gName].comps[lvlUpper].count++;
        mdcMap[gName].comps[lvlUpper].tIna += tarif;
        mdcMap[gName].comps[lvlUpper].tIdrg += finalTarifIdrgGroup;

        // Use primary diagnosis ICD for drilldown label
        const icdCode = diaglist.length > 0 ? diaglist[0] : (proclist.length > 0 ? proclist[0] : 'Unknown');
        let icdDesc = (icdDescMap && icdDescMap.get(icdCode)) ? icdDescMap.get(icdCode) : (fallbackDict[icdCode] || '');
        if (!icdDesc && icdCode.includes('.')) icdDesc = fallbackDict[icdCode.split('.')[0]] || '';
        if (!icdDesc) icdDesc = '(Deskripsi tidak tersedia di Master Data)';

        if (!mdcMap[gName].comps[lvlUpper].icds[icdCode]) {
          mdcMap[gName].comps[lvlUpper].icds[icdCode] = { code: icdCode, desc: icdDesc, count: 0, tIna: 0, tIdrg: 0, loss: 0, isOutsideGroup };
        }
        mdcMap[gName].comps[lvlUpper].icds[icdCode].count++;
        mdcMap[gName].comps[lvlUpper].icds[icdCode].tIna += tarif;
        mdcMap[gName].comps[lvlUpper].icds[icdCode].tIdrg += finalTarifIdrgGroup;
        mdcMap[gName].comps[lvlUpper].icds[icdCode].loss += lossValueGroup;

        if (dpjpMap[dpjpKey].comps[gName].levels && dpjpMap[dpjpKey].comps[gName].levels[lvlUpper]) {
          const dpjpLvl = dpjpMap[dpjpKey].comps[gName].levels[lvlUpper];
          dpjpLvl.count++; dpjpLvl.tIna += tarif; dpjpLvl.tIdrg += finalTarifIdrgGroup;
          if (!dpjpLvl.icds[icdCode]) dpjpLvl.icds[icdCode] = { code: icdCode, desc: icdDesc, count: 0, tIna: 0, tIdrg: 0, loss: 0, isOutsideGroup };
          dpjpLvl.icds[icdCode].count++; dpjpLvl.icds[icdCode].tIna += tarif;
          dpjpLvl.icds[icdCode].tIdrg += finalTarifIdrgGroup; dpjpLvl.icds[icdCode].loss += lossValueGroup;
        }
      }
    }

    let overallMaxLevelStr = 'Belum Ada Mapping', overallMaxLevelInt = 0, anyOutside = false;
    for (const reqComp of patientNeededCompetencies) {
      if (reqComp.levelInt > overallMaxLevelInt) { overallMaxLevelInt = reqComp.levelInt; overallMaxLevelStr = reqComp.level; }
      const rsLvl = myCompetencies[reqComp.group];
      if ((rsLvl ? (levelValues[rsLvl] || 0) : 0) < reqComp.levelInt) anyOutside = true;
    }
    if (overallMaxLevelInt === 0) overallMaxLevelStr = 'Belum Ada Mapping';

    if (!reports.inaCbg[monthKey]) reports.inaCbg[monthKey] = { monthKey, sl0_c: 0, sl0_t: 0, sl1_c: 0, sl1_t: 0, sl2_c: 0, sl2_t: 0, sl3_c: 0, sl3_t: 0, total_c: 0, total_t: 0 };
    if (!reports.idrg[monthKey]) reports.idrg[monthKey] = { monthKey, d_c: 0, d_t: 0, m_c: 0, m_t: 0, u_c: 0, u_t: 0, p_c: 0, p_t: 0, unmapped_c: 0, unmapped_t: 0, topup_c: 0, topup_t: 0, total_c: 0 };
    if (!reports.gabungan[monthKey]) reports.gabungan[monthKey] = { monthKey, rj_tRs: 0, ri_tRs: 0, inacbg_rj_c: 0, inacbg_ri_c: 0, inacbg_rj_t: 0, inacbg_ri_t: 0, idrg_rj_c: 0, idrg_ri_c: 0, idrg_rj_t: 0, idrg_ri_t: 0, ungroup_c: 0 };

    reports.inaCbg[monthKey][`sl${severity}_c`]++;
    reports.inaCbg[monthKey][`sl${severity}_t`] += tarif;
    reports.inaCbg[monthKey].total_c++;
    reports.inaCbg[monthKey].total_t += tarif;

    if (isUnmapped) {
      reports.idrg[monthKey].unmapped_c++; reports.idrg[monthKey].unmapped_t += tarifIdrgRaw;
    } else {
      const lvlMap = { Dasar: 'd', Madya: 'm', Utama: 'u', Paripurna: 'p' };
      const lKey = lvlMap[overallMaxLevelStr];
      if (lKey) { reports.idrg[monthKey][`${lKey}_c`]++; reports.idrg[monthKey][`${lKey}_t`] += tarifIdrgRaw; }
    }
    if (topUp > 0) { reports.idrg[monthKey].topup_c++; reports.idrg[monthKey].topup_t += topUp; }
    reports.idrg[monthKey].total_c++;

    if (!isUngroupable && drgCode) {
      const reportDrg = isRI ? reports.idrg_ri : reports.idrg_rj;
      if (!reportDrg[drgCode]) reportDrg[drgCode] = { drgCode, drgDesc, cases: 0, tRs: 0, tIna: 0, tIdrg: 0 };
      reportDrg[drgCode].cases++; reportDrg[drgCode].tRs += tarifRs;
      reportDrg[drgCode].tIna += tarif; reportDrg[drgCode].tIdrg += tarifIdrgRaw;
    }

    const gab = reports.gabungan[monthKey];
    if (isUngroupable) gab.ungroup_c++;
    if (isRI) {
      gab.ri_tRs += tarifRs; gab.inacbg_ri_c++; gab.inacbg_ri_t += tarif; gab.idrg_ri_c++; gab.idrg_ri_t += tarifIdrgRaw;
    } else {
      gab.rj_tRs += tarifRs; gab.inacbg_rj_c++; gab.inacbg_rj_t += tarif; gab.idrg_rj_c++; gab.idrg_rj_t += tarifIdrgRaw;
    }

    if (anyOutside) {
      patientsOutsideCompetency++; tarifOutsideCompetency += tarifIdrgRaw;
      if (gapAnomalies.length < 100) gapAnomalies.push({ mrn, sep, nama: patientName, diagnosa: diaglist.join('; '), missingCompetencies });
    } else {
      patientsWithinCompetency++; tarifWithinCompetency += tarifIdrgRaw;
    }
  }

  // Finalize ICD objects → arrays
  for (const g of Object.values(mdcMap)) {
    for (const lvl of ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA']) {
      if (g.comps?.[lvl]?.icds) g.comps[lvl].icds = Object.values(g.comps[lvl].icds).sort((a, b) => b.count - a.count);
    }
  }
  for (const d of Object.values(dpjpMap)) {
    if (d.comps) {
      for (const c of Object.values(d.comps)) {
        if (c.levels) {
          for (const lvl of ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA']) {
            if (c.levels[lvl]?.icds) c.levels[lvl].icds = Object.values(c.levels[lvl].icds).sort((a, b) => b.count - a.count);
          }
        }
      }
    }
  }

  const kelompokLayananData = Object.values(mdcMap).sort((a, b) => {
    if (a.name === 'KASUS BELUM MAPPING') return 1;
    if (b.name === 'KASUS BELUM MAPPING') return -1;
    return b.count - a.count;
  });

  const gabSorted = Object.values(reports.gabungan).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  const monthlyArray = gabSorted.map(g => ({
    label: g.monthKey,
    tarifRs: g.ri_tRs + g.rj_tRs,
    inacbg: g.inacbg_ri_t + g.inacbg_rj_t,
    idrg: g.idrg_ri_t + g.idrg_rj_t,
    selisih: (g.idrg_ri_t + g.idrg_rj_t) - (g.inacbg_ri_t + g.inacbg_rj_t)
  }));

  const finalReports = {
    inaCbg: Object.values(reports.inaCbg).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    idrg: Object.values(reports.idrg).sort((a, b) => a.monthKey.localeCompare(b.monthKey)),
    idrg_ri: Object.values(reports.idrg_ri).sort((a, b) => a.drgCode.localeCompare(b.drgCode)),
    idrg_rj: Object.values(reports.idrg_rj).sort((a, b) => a.drgCode.localeCompare(b.drgCode)),
    gabungan: gabSorted, ungroupable: reports.ungroupable, unmapped: reports.unmapped
  };

  const getTopIcd = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => ({ code: e[0], count: e[1], desc: icdDescMap.get(e[0]) || '' }));
  const getTop10Selisih = (obj) => Object.entries(obj)
    .filter(e => e[1].count > 0 && e[1].selisihTotal > 0)
    .sort((a, b) => b[1].selisihTotal - a[1].selisihTotal)
    .slice(0, 10)
    .map(e => ({ code: e[0], desc: e[1].desc, count: e[1].count, selisihVsRs: e[1].selisihTotal, totalTarif: e[1].totalTarif, totalTarifRs: e[1].totalTarifRs }));

  const finalResponse = {
    summary: { totalPatients, patientsWithinCompetency, patientsOutsideCompetency, totalTarifInacbg, tarifWithinCompetency, tarifOutsideCompetency },
    kpis: { totalCases: totalPatients, totalTarifInacbg, totalTarifIdrg: totalTarifIdrgRaw },
    dashboard: {
      ranapCount, totalRows: totalPatients, tRs: totalTarifRs, tIna: totalTarifInacbg, tIdrg: totalTarifIdrgRaw,
      cInaHigh, cIdrgHigh, cEq, dischargeStats, monthlyArray,
      selisihTotal: totalTarifIdrgRaw - totalTarifInacbg,
      rataIna: totalPatients ? totalTarifInacbg / totalPatients : 0,
      rataIdrg: totalPatients ? totalTarifIdrgRaw / totalPatients : 0,
      topDiagUtama: getTopIcd(diagUtamaFreq), topDiagSekunder: getTopIcd(diagSekunderFreq), topProc: getTopIcd(procFreq),
      topSurplusIna: getTop10Selisih(inaSurplus), topDefisitIna: getTop10Selisih(inaDefisit),
      topSurplus: getTop10Selisih(idrgSurplus), topDefisit: getTop10Selisih(idrgDefisit),
      severityStats, complexityStats
    },
    anomalies: gapAnomalies,
    reports: finalReports,
    kelompokLayananData,
    dpjpData: Object.values(dpjpMap).sort((a, b) => b.count - a.count)
  };

  // Append mode: merge with previous result
  if (appendMode) {
    const prev = loadResult();
    if (prev) return mergeResults(prev, finalResponse);
  }

  return finalResponse;
}

function mergeResults(prev, curr) {
  const ps = prev.summary || {}, cs = curr.summary;
  cs.totalPatients += ps.totalPatients || 0;
  cs.patientsWithinCompetency += ps.patientsWithinCompetency || 0;
  cs.patientsOutsideCompetency += ps.patientsOutsideCompetency || 0;
  cs.totalTarifInacbg += ps.totalTarifInacbg || 0;
  cs.tarifWithinCompetency += ps.tarifWithinCompetency || 0;
  cs.tarifOutsideCompetency += ps.tarifOutsideCompetency || 0;

  curr.kpis.totalCases = cs.totalPatients;
  curr.kpis.totalTarifInacbg = cs.totalTarifInacbg;

  const pd = prev.dashboard || {}, cd = curr.dashboard;
  cd.totalRows = cs.totalPatients;
  ['ranapCount','tIna','tIdrg','tRs','cInaHigh','cIdrgHigh','cEq'].forEach(k => { cd[k] = (cd[k] || 0) + (pd[k] || 0); });
  cd.selisihTotal = cd.tIdrg - cd.tIna;
  cd.rataIna = cd.totalRows ? cd.tIna / cd.totalRows : 0;
  cd.rataIdrg = cd.totalRows ? cd.tIdrg / cd.totalRows : 0;

  ['severityStats','complexityStats','dischargeStats'].forEach(sk => {
    Object.keys(pd[sk] || {}).forEach(k => { cd[sk][k] = (cd[sk][k] || 0) + (pd[sk][k] || 0); });
  });

  const pr = prev.reports || {}, cr = curr.reports || {};
  ['inaCbg','idrg','gabungan'].forEach(rType => {
    (pr[rType] || []).forEach(pItem => {
      const cItem = cr[rType].find(c => c.monthKey === pItem.monthKey);
      if (cItem) { Object.keys(pItem).forEach(f => { if (typeof pItem[f] === 'number') cItem[f] = (cItem[f] || 0) + pItem[f]; }); }
      else cr[rType].push({ ...pItem });
    });
    cr[rType].sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  });
  ['idrg_ri','idrg_rj'].forEach(rType => {
    (pr[rType] || []).forEach(pItem => {
      const cItem = cr[rType].find(c => c.drgCode === pItem.drgCode);
      if (cItem) { ['cases','tRs','tIna','tIdrg'].forEach(f => { cItem[f] = (cItem[f] || 0) + (pItem[f] || 0); }); }
      else cr[rType].push({ ...pItem });
    });
    cr[rType].sort((a, b) => a.drgCode.localeCompare(b.drgCode));
  });
  cr.gabungan && (cd.monthlyArray = cr.gabungan.map(g => ({
    label: g.monthKey, tarifRs: g.ri_tRs + g.rj_tRs,
    inacbg: g.inacbg_ri_t + g.inacbg_rj_t, idrg: g.idrg_ri_t + g.idrg_rj_t,
    selisih: (g.idrg_ri_t + g.idrg_rj_t) - (g.inacbg_ri_t + g.inacbg_rj_t)
  })));

  curr.anomalies = [...(curr.anomalies || []), ...(prev.anomalies || [])];
  return curr;
}
