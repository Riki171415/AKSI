const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { icdMap, icdDescMap, competencies } = require('../utils/csvLoader');
const { hospitalSettings } = require('../store');

let fallbackDict = {};
try {
    fallbackDict = require('../data/icd_fallback.json');
} catch(e) {
    console.error("Could not load fallback dictionary");
}

const upload = multer({ dest: 'uploads/' });

exports.uploadMiddleware = upload.single('file');

const parseTarif = (valStr) => {
    if (!valStr) return 0;
    let s = valStr.toString().trim().replace(/['"]/g, '');
    s = s.replace(/[,.]00$/, '');
    s = s.replace(/[,.]/g, '');
    return parseFloat(s) || 0;
};

const levelValues = {
    "Belum Ada Mapping": 0,
    "Dasar": 1,
    "Madya": 2,
    "Utama": 3,
    "Paripurna": 4
};

// Global memory for the latest analysis
let lastAnalysisResult = null;
let lastRsConfig = null;

exports.clearAnalysis = (req, res) => {
    lastAnalysisResult = null;
    lastRsConfig = null;
    res.json({ message: 'Data analisis berhasil dihapus.' });
};

exports.getLatestAnalysis = (req, res) => {
    if (!lastAnalysisResult) {
        return res.status(404).json({ message: "Belum ada data analisis. Silakan unggah file TXT terlebih dahulu." });
    }
    res.json(lastAnalysisResult);
};

exports.analyzeTxt = async (req, res) => {
    const isAppend = req.query.mode === 'append';
    let myCompetencies = {};
    if (req.body.rsConfig) {
        try {
            const config = JSON.parse(req.body.rsConfig);
            myCompetencies = config.competencies || {};
            lastRsConfig = req.body.rsConfig;
        } catch(e) {
            console.error("Invalid rsConfig JSON");
        }
    } else if (lastRsConfig) {
        try { myCompetencies = JSON.parse(lastRsConfig).competencies || {}; } catch(e){}
    }
    
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan' });
    }
    
    const filePath = req.file.path;
    
    // Core KPIs
    let totalPatients = 0;
    let patientsWithinCompetency = 0;
    let patientsOutsideCompetency = 0;
    let totalTarifInacbg = 0;
    let tarifWithinCompetency = 0;
    let tarifOutsideCompetency = 0;
    let gapAnomalies = [];
    
    // Dashboard Specific KPIs
    let ranapCount = 0;
    let totalTarifRs = 0;
    let totalTarifIdrgRaw = 0;
    let cInaHigh = 0;
    let cIdrgHigh = 0;
    let cEq = 0;
    let dischargeStats = { "1":0, "2":0, "3":0, "4":0, "5":0 };
    
    // Frequencies for Top 10
    let diagUtamaFreq = {};
    let diagSekunderFreq = {};
    let procFreq = {};
    
    // Maps for Top 10 Defisit/Surplus
    let idrgSurplus = {};
    let idrgDefisit = {};
    let dpjpMap = {};
    let inaSurplus = {};
    let inaDefisit = {};
    
    const severityStats = { 0: 0, 1: 0, 2: 0, 3: 0 };
    const complexityStats = { 'Rawat Jalan': 0, 'No CC': 0, 'Mild CC': 0, 'Moderate CC': 0, 'Severe CC': 0, 'Catastrophic CC': 0, 'Merge CC': 0, 'Unknown': 0 };
    
    // Detailed Aggregation Maps
    let mdcMap = {};
    competencies.forEach(c => {
        mdcMap[c] = {
            name: c,
            count: 0, tInacbg: 0, tIdrg: 0,
            sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
            tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
            comps: {
                DASAR: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
                MADYA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
                UTAMA: { count: 0, tIna: 0, tIdrg: 0, icds: {} },
                PARIPURNA: { count: 0, tIna: 0, tIdrg: 0, icds: {} }
            }
        };
    });
    
    // NEW REPORTS STRUCTURE FOR EXCEL V5
    let reports = {
        inaCbg: {}, 
        idrg: {},   
        idrg_ri: {}, 
        idrg_rj: {}, 
        gabungan: {},
        ungroupable: [],
        unmapped: []
    };
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    let isHeader = true;
    let headers = [];

    const maskName = (name) => {
        if (!name || name === 'Unknown') return 'Unknown';
        return name.split(' ').map(word => {
            if (word.length <= 2) return word;
            return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
        }).join(' ');
    };
    
    for await (const line of rl) {
        if (!line.trim()) continue;
        const columns = line.split('\t');
        
        if (isHeader) {
            headers = columns.map(h => h.trim());
            isHeader = false;
            continue;
        }
        
        const diagIdx = headers.indexOf('DIAGLIST');
        const procIdx = headers.indexOf('PROCLIST');
        const nameIdx = headers.indexOf('NAMA_PASIEN');
        const mrnIdx = headers.indexOf('MRN');
        const sepIdx = headers.indexOf('SEP');
        const dateIdx = headers.indexOf('DISCHARGE_DATE');
        const tarifIdx = headers.indexOf('TOTAL_TARIF');
        const tarifRsIdx = headers.indexOf('TARIF_RS');
        const idrgTarifIdx = headers.indexOf('IDRG_TOTAL_TARIF');
        const birthDateIdx = headers.indexOf('BIRTH_DATE');
        const sexIdx = headers.indexOf('SEX');
        
        const idrgMdcIdx = headers.indexOf('IDRG_MDC_NUMBER');
        const idrgDrgCodeIdx = headers.indexOf('IDRG_DRG_CODE');
        const idrgDrgDescIdx = headers.indexOf('IDRG_DRG_DESCRIPTION');
        const idrgTopUpIdx = headers.indexOf('IDRG_TOP_UP');
        
        let inacbgDescIdx = headers.findIndex(h => h === 'INACBG_DESKRIPSI' || h === 'INACBG_DESCRIPTION' || (h.includes('INACBG') && h.toLowerCase().includes('desk')));
        
        const inacbgIdx = headers.findIndex(h => h.includes('INACBG') && h !== headers[inacbgDescIdx]);
        let ptdIdx = headers.indexOf('JENIS_RAWAT');
        if (ptdIdx === -1) ptdIdx = headers.indexOf('PTD');
        if (ptdIdx === -1) ptdIdx = headers.indexOf('PELAYANAN');
        
        let dischargeIdx = headers.indexOf('DISCHARGE_STATUS');
        if (dischargeIdx === -1) dischargeIdx = headers.indexOf('STATUS_PULANG');
        if (dischargeIdx === -1) dischargeIdx = headers.indexOf('CARA_PULANG');
        
        let dpjpIdx = -1;
        for (let i = 0; i < headers.length; i++) {
            const h = headers[i].trim().toUpperCase();
            if (h === 'DPJP' || h === 'NAMA_DOKTER' || h === 'NAMA DOKTER' || h === 'DOKTER_PJ' || h === 'DOKTER' || h === 'NAMA_DPJP' || h === 'DOKTER_DPJP') {
                dpjpIdx = i;
                break;
            }
        }
        
        if (diagIdx === -1) continue;
        
        const diaglist = (columns[diagIdx] || '').split(';');
        const proclist = procIdx !== -1 ? (columns[procIdx] || '').split(';') : [];
        
        if (diaglist.length > 0) {
            const ut = diaglist[0].trim();
            if (ut) diagUtamaFreq[ut] = (diagUtamaFreq[ut] || 0) + 1;
            for (let i = 1; i < diaglist.length; i++) {
                const sec = diaglist[i].trim();
                if (sec) diagSekunderFreq[sec] = (diagSekunderFreq[sec] || 0) + 1;
            }
        }
        for (const p of proclist) {
            const pt = p.trim();
            if (pt) procFreq[pt] = (procFreq[pt] || 0) + 1;
        }
        
        const patientRaw = nameIdx !== -1 ? columns[nameIdx] : 'Unknown';
        const patientName = maskName(patientRaw.trim());
        const mrn = mrnIdx !== -1 ? columns[mrnIdx] : 'Unknown';
        const sep = sepIdx !== -1 ? columns[sepIdx] : 'Unknown';
        
        const mdcNum = idrgMdcIdx !== -1 ? columns[idrgMdcIdx] : '';
        const drgCode = idrgDrgCodeIdx !== -1 ? columns[idrgDrgCodeIdx] : '';
        const drgDesc = idrgDrgDescIdx !== -1 ? columns[idrgDrgDescIdx] : '';
        const topUp = idrgTopUpIdx !== -1 ? parseTarif(columns[idrgTopUpIdx]) : 0;
        
        let isBedah = false;
        if (drgCode && drgCode.length >= 4) {
            const digit34 = parseInt(drgCode.substring(2, 4));
            if (!isNaN(digit34) && digit34 >= 0 && digit34 <= 40) {
                isBedah = true;
            }
        }
        const typeLayanan = isBedah ? 'Bedah' : 'Non-Bedah';
        const isUngroupable = mdcNum === '36';
        
        const dateStr = dateIdx !== -1 ? columns[dateIdx] : '';
        let monthKey = "Unknown";
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 3) monthKey = parts[2] + '-' + parts[1];
        } else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 3) monthKey = parts[0] + '-' + parts[1];
        }
        
        const tarifValStr = (tarifIdx !== -1 && columns[tarifIdx]) ? columns[tarifIdx] : "0";
        const tarif = parseTarif(tarifValStr);
        
        const trsValStr = (tarifRsIdx !== -1 && columns[tarifRsIdx]) ? columns[tarifRsIdx] : "0";
        const tarifRs = parseTarif(trsValStr);
        
        const idrgTarifValStr = (idrgTarifIdx !== -1 && columns[idrgTarifIdx]) ? columns[idrgTarifIdx] : "0";
        const tarifIdrgRaw = (idrgTarifIdx !== -1) ? parseTarif(idrgTarifValStr) : tarif;
        
        const birthDateStr = birthDateIdx !== -1 ? columns[birthDateIdx] : '';
        const sexVal = sexIdx !== -1 ? columns[sexIdx] : '';
        
        let ageInDays = 999; 
        if (birthDateStr && dateStr) {
            const parseDate = (dStr) => {
                if (!dStr) return null;
                if (dStr.includes('/')) {
                    const p = dStr.split('/');
                    if (p.length >= 3) return new Date(`${p[2]}-${p[1]}-${p[0]}`);
                } else if (dStr.includes('-')) {
                    return new Date(dStr);
                }
                return null;
            };
            const bDate = parseDate(birthDateStr);
            const dDate = parseDate(dateStr);
            if (bDate && dDate && !isNaN(bDate.getTime()) && !isNaN(dDate.getTime())) {
                const diffTime = Math.abs(dDate.getTime() - bDate.getTime());
                ageInDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        const inacbgCode = (inacbgIdx !== -1 && columns[inacbgIdx]) ? columns[inacbgIdx].trim() : '';
        const inacbgDesc = inacbgDescIdx !== -1 ? columns[inacbgDescIdx] : '';
        let ptd = ptdIdx !== -1 ? columns[ptdIdx] : ''; 
        let isRI;
        if (ptd) {
            isRI = ptd === '1' || ptd.toLowerCase().includes('inap');
        } else {
            isRI = inacbgCode ? !(inacbgCode.endsWith('-0') || inacbgCode.endsWith('0')) : true;
        }
        
        const dStat = dischargeIdx !== -1 ? columns[dischargeIdx].trim() : '';
        if (['1', '2', '3', '4'].includes(dStat)) dischargeStats[dStat]++;
        else dischargeStats["5"]++;
        
        const dpjpNameRaw = dpjpIdx !== -1 ? columns[dpjpIdx] : '';
        let dpjpRealName = dpjpNameRaw ? dpjpNameRaw.trim() : 'Tidak Diketahui';
        if (dpjpRealName === '-' || dpjpRealName === '' || dpjpRealName === '*') dpjpRealName = 'Tidak Diketahui';
        
        let dpjpName = dpjpRealName !== 'Tidak Diketahui' ? maskName(dpjpRealName) : 'Tidak Diketahui';
        
        if (!dpjpMap[dpjpRealName]) {
            dpjpMap[dpjpRealName] = {
                name: dpjpName,
                realName: dpjpRealName,
                count: 0,
                sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
                tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
                comps: {}
            };
        }
        dpjpMap[dpjpRealName].count++;
        
        if (isRI) ranapCount++;
        totalTarifRs += tarifRs;
        totalTarifIdrgRaw += tarifIdrgRaw;
        
        const rtIdrg = Math.round(tarifIdrgRaw);
        const rtIna = Math.round(tarif);
        if (rtIna > rtIdrg) cInaHigh++;
        else if (rtIdrg > rtIna) cIdrgHigh++;
        else cEq++;
        
        // Track Surplus/Defisit
        if (inacbgCode) {
            const selisihIna = tarif - tarifRs;
            if (!inaSurplus[inacbgCode]) inaSurplus[inacbgCode] = { count: 0, selisihTotal: 0, desc: inacbgDesc };
            if (!inaDefisit[inacbgCode]) inaDefisit[inacbgCode] = { count: 0, selisihTotal: 0, desc: inacbgDesc };
            
            if (selisihIna >= 0) {
                inaSurplus[inacbgCode].count++;
                inaSurplus[inacbgCode].selisihTotal += selisihIna;
            } else {
                inaDefisit[inacbgCode].count++;
                inaDefisit[inacbgCode].selisihTotal += Math.abs(selisihIna);
            }
        }
        
        if (drgCode) {
            const selisihIdrg = tarifIdrgRaw - tarifRs;
            if (!idrgSurplus[drgCode]) idrgSurplus[drgCode] = { count: 0, selisihTotal: 0, desc: drgDesc };
            if (!idrgDefisit[drgCode]) idrgDefisit[drgCode] = { count: 0, selisihTotal: 0, desc: drgDesc };
            
            if (selisihIdrg >= 0) {
                idrgSurplus[drgCode].count++;
                idrgSurplus[drgCode].selisihTotal += selisihIdrg;
            } else {
                idrgDefisit[drgCode].count++;
                idrgDefisit[drgCode].selisihTotal += Math.abs(selisihIdrg);
            }
        }
        
        let severity = isRI ? 1 : 0;
        if (inacbgCode.endsWith('III')) severity = 3;
        else if (inacbgCode.endsWith('II')) severity = 2;
        else if (inacbgCode.endsWith('I') && isRI) severity = 1;
        severityStats[severity]++;
        
        let complexity = 'Rawat Jalan';
        if (isRI && drgCode) {
            const lastDigit = drgCode.slice(-1);
            if (lastDigit === '0') complexity = 'No CC';
            else if (lastDigit === '1') complexity = 'Mild CC';
            else if (lastDigit === '2') complexity = 'Moderate CC';
            else if (lastDigit === '3') complexity = 'Severe CC';
            else if (lastDigit === '4') complexity = 'Catastrophic CC';
            else if (lastDigit === '9') complexity = 'Merge CC';
            else complexity = 'Unknown';
        }
        if (complexityStats[complexity] !== undefined) complexityStats[complexity]++;
        else complexityStats['Unknown']++;
        
        const allIcds = [...diaglist, ...proclist].filter(c => c.trim());
        
        let patientNeededCompetencies = [];
        let groupNamesForPatient = new Set();
        
        let highestComp = null;
        for (const icd of allIcds) {
            const cleanIcd = icd.trim();
            let needed = icdMap.get(cleanIcd) || icdMap.get(cleanIcd.replace('.', ''));
            if (!needed && cleanIcd.includes('.')) needed = icdMap.get(cleanIcd.split('.')[0]);
            
            if (needed) {
                for (const n of needed) {
                    const gNameLower = n.group.toLowerCase();
                    if (gNameLower.includes('neonatus') && ageInDays >= 29) continue;
                    if ((gNameLower.includes('obgyn') || gNameLower.includes('kandungan') || gNameLower.includes('obstetri')) && sexVal !== '2') continue;
                    
                    if (!highestComp || n.levelInt > highestComp.levelInt) {
                        highestComp = n;
                    }
                }
            }
        }
        
        if (highestComp) {
            patientNeededCompetencies.push(highestComp);
            groupNamesForPatient.add(highestComp.group);
        }
        
        const isUnmapped = !isUngroupable && patientNeededCompetencies.length === 0;
        
        if (isUnmapped) {
            const primaryIcd = allIcds.length > 0 ? allIcds[0].trim() : 'UNKNOWN';
            let desc = fallbackDict[primaryIcd];
            if (!desc && primaryIcd.includes('.')) {
                desc = fallbackDict[primaryIcd.split('.')[0]];
            }
            if (!desc) desc = 'Tidak ada deskripsi';
            
            patientNeededCompetencies.push({
                code: primaryIcd,
                desc: desc,
                group: "KASUS BELUM MAPPING",
                level: "Belum Ada Mapping",
                levelInt: 0
            });
            groupNamesForPatient.add("KASUS BELUM MAPPING");
        }
        
        if (isUngroupable && reports.ungroupable.length < 500) {
            reports.ungroupable.push({ mrn, sep, nama: patientName, desc: drgDesc || inacbgCode, icd: diaglist.join('; '), type: typeLayanan, ket: 'Ungroupable' });
        }
        if (isUnmapped && reports.unmapped.length < 500) {
            reports.unmapped.push({ mrn, sep, nama: patientName, desc: drgDesc || inacbgCode, icd: diaglist.join('; '), type: typeLayanan, ket: 'Belum Ada Mapping Kompetensi' });
        }
        
        totalPatients++;
        totalTarifInacbg += tarif;
        
        let missingCompetencies = [];
        let missingSet = new Set();
        
        for (const gName of groupNamesForPatient) {
            let reqLevelStr = "Belum Ada Mapping";
            let reqLevelInt = 0;
            for (const reqComp of patientNeededCompetencies) {
                if (reqComp.group === gName) {
                    if (reqComp.levelInt > reqLevelInt) {
                        reqLevelInt = reqComp.levelInt;
                        reqLevelStr = reqComp.level;
                    }
                }
            }
            if (reqLevelInt === 0) {
                reqLevelInt = 0;
                reqLevelStr = "Belum Ada Mapping";
            }
            
            const rsLevelStr = myCompetencies[gName] || 'Belum Diatur';
            const rsLevelInt = rsLevelStr !== 'Belum Diatur' ? (levelValues[rsLevelStr] || 0) : 0;
            
            const isOutsideGroup = rsLevelInt < reqLevelInt;
            const finalTarifIdrgGroup = isOutsideGroup ? 0 : tarifIdrgRaw;
            const lossValueGroup = isOutsideGroup ? tarifIdrgRaw : 0;
            
            if (isOutsideGroup) {
                const msg = `${gName} (Butuh: ${reqLevelStr})`;
                if (!missingSet.has(msg)) {
                    missingSet.add(msg);
                    missingCompetencies.push(msg);
                }
            }
            
            if (!mdcMap[gName]) {
                mdcMap[gName] = {
                    name: gName, count: 0, tInacbg: 0, tIdrg: 0, 
                    sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0, 
                    tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
                    rsLevel: rsLevelStr,
                    comps: { 
                        BELUM_ADA_MAPPING: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        DASAR: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        MADYA: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        UTAMA: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        PARIPURNA: {count:0, tIna:0, tIdrg:0, icds: {}} 
                    }
                };
            }
            if (!mdcMap[gName].rsLevel) {
                 mdcMap[gName].rsLevel = rsLevelStr;
            }
            mdcMap[gName].count++;
            mdcMap[gName].tInacbg += tarif;
            mdcMap[gName].tIdrg += finalTarifIdrgGroup;
            
            if (isOutsideGroup) {
                mdcMap[gName].tidak_sesuai_c++;
                mdcMap[gName].tidak_sesuai_t += tarifIdrgRaw;
                mdcMap[gName].tidak_sesuai_ina += tarif;
                
                dpjpMap[dpjpRealName].tidak_sesuai_c++;
                dpjpMap[dpjpRealName].tidak_sesuai_t += tarifIdrgRaw;
                dpjpMap[dpjpRealName].tidak_sesuai_ina += tarif;
            } else {
                mdcMap[gName].sesuai_c++;
                mdcMap[gName].sesuai_t += tarifIdrgRaw;
                mdcMap[gName].sesuai_ina += tarif;
                
                dpjpMap[dpjpRealName].sesuai_c++;
                dpjpMap[dpjpRealName].sesuai_t += tarifIdrgRaw;
                dpjpMap[dpjpRealName].sesuai_ina += tarif;
            }
            
            if (!dpjpMap[dpjpRealName].comps[gName]) {
                dpjpMap[dpjpRealName].comps[gName] = {
                    name: gName, count: 0,
                    sesuai_c: 0, sesuai_t: 0, sesuai_ina: 0,
                    tidak_sesuai_c: 0, tidak_sesuai_t: 0, tidak_sesuai_ina: 0,
                    levels: { 
                        BELUM_ADA_MAPPING: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        DASAR: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        MADYA: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        UTAMA: {count:0, tIna:0, tIdrg:0, icds: {}}, 
                        PARIPURNA: {count:0, tIna:0, tIdrg:0, icds: {}} 
                    }
                };
            }
            dpjpMap[dpjpRealName].comps[gName].count++;
            if (isOutsideGroup) {
                dpjpMap[dpjpRealName].comps[gName].tidak_sesuai_c++;
                dpjpMap[dpjpRealName].comps[gName].tidak_sesuai_t += tarifIdrgRaw;
                dpjpMap[dpjpRealName].comps[gName].tidak_sesuai_ina += tarif;
            } else {
                dpjpMap[dpjpRealName].comps[gName].sesuai_c++;
                dpjpMap[dpjpRealName].comps[gName].sesuai_t += tarifIdrgRaw;
                dpjpMap[dpjpRealName].comps[gName].sesuai_ina += tarif;
            }
            
            const lvlUpper = reqLevelStr.toUpperCase().replace(/ /g, '_');
            if (mdcMap[gName].comps[lvlUpper]) {
                mdcMap[gName].comps[lvlUpper].count++;
                mdcMap[gName].comps[lvlUpper].tIna += tarif;
                mdcMap[gName].comps[lvlUpper].tIdrg += finalTarifIdrgGroup;
                
                const icdCode = (diaglist.length > 0 && diaglist[0].trim()) ? diaglist[0].trim() : 'Unknown';
                let icdDesc = (icdDescMap && icdDescMap.get(icdCode)) ? icdDescMap.get(icdCode) : fallbackDict[icdCode];
                if (!icdDesc && icdCode.includes('.')) {
                    icdDesc = fallbackDict[icdCode.split('.')[0]];
                }
                if (!icdDesc) icdDesc = '(Deskripsi tidak tersedia di Master Data)';
                
                if (!mdcMap[gName].comps[lvlUpper].icds[icdCode]) {
                    mdcMap[gName].comps[lvlUpper].icds[icdCode] = {
                        code: icdCode, desc: icdDesc, count: 0, tIna: 0, tIdrg: 0, loss: 0, isOutsideGroup: isOutsideGroup
                    };
                }
                mdcMap[gName].comps[lvlUpper].icds[icdCode].count++;
                mdcMap[gName].comps[lvlUpper].icds[icdCode].tIna += tarif;
                mdcMap[gName].comps[lvlUpper].icds[icdCode].tIdrg += finalTarifIdrgGroup;
                mdcMap[gName].comps[lvlUpper].icds[icdCode].loss += lossValueGroup;
                
                // For DPJP
                if (dpjpMap[dpjpRealName].comps[gName].levels && dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper]) {
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].count++;
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].tIna += tarif;
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].tIdrg += finalTarifIdrgGroup;
                    
                    if (!dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode]) {
                        dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode] = {
                            code: icdCode, desc: icdDesc, count: 0, tIna: 0, tIdrg: 0, loss: 0, isOutsideGroup: isOutsideGroup
                        };
                    }
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode].count++;
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode].tIna += tarif;
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode].tIdrg += finalTarifIdrgGroup;
                    dpjpMap[dpjpRealName].comps[gName].levels[lvlUpper].icds[icdCode].loss += lossValueGroup;
                }
            }
        }
        
        let overallMaxLevelStr = "Belum Ada Mapping";
        let overallMaxLevelInt = 0;
        let anyOutside = false;
        for (const reqComp of patientNeededCompetencies) {
            if (reqComp.levelInt > overallMaxLevelInt) {
                overallMaxLevelInt = reqComp.levelInt;
                overallMaxLevelStr = reqComp.level;
            }
            const rsLvl = myCompetencies[reqComp.group];
            const rsLvlInt = rsLvl ? (levelValues[rsLvl] || 0) : 0;
            if (rsLvlInt < reqComp.levelInt) {
                anyOutside = true;
            }
        }
        if (overallMaxLevelInt === 0) overallMaxLevelStr = "Belum Ada Mapping";
        
        if (!reports.inaCbg[monthKey]) reports.inaCbg[monthKey] = { monthKey, sl0_c:0, sl0_t:0, sl1_c:0, sl1_t:0, sl2_c:0, sl2_t:0, sl3_c:0, sl3_t:0, total_c:0, total_t:0 };
        if (!reports.idrg[monthKey]) reports.idrg[monthKey] = { monthKey, d_c:0, d_t:0, m_c:0, m_t:0, u_c:0, u_t:0, p_c:0, p_t:0, unmapped_c:0, unmapped_t:0, topup_c:0, topup_t:0, total_c:0 };
        if (!reports.gabungan[monthKey]) reports.gabungan[monthKey] = { monthKey, rj_tRs:0, ri_tRs:0, inacbg_rj_c:0, inacbg_ri_c:0, inacbg_rj_t:0, inacbg_ri_t:0, idrg_rj_c:0, idrg_ri_c:0, idrg_rj_t:0, idrg_ri_t:0, ungroup_c:0 };
        
        reports.inaCbg[monthKey][`sl${severity}_c`]++;
        reports.inaCbg[monthKey][`sl${severity}_t`] += tarif;
        reports.inaCbg[monthKey].total_c++;
        reports.inaCbg[monthKey].total_t += tarif;
        
        if (isUnmapped) {
             reports.idrg[monthKey].unmapped_c++;
             reports.idrg[monthKey].unmapped_t += tarifIdrgRaw;
        } else {
             const lvlMap = { 'Dasar': 'd', 'Madya': 'm', 'Utama': 'u', 'Paripurna': 'p' };
             const lKey = lvlMap[overallMaxLevelStr];
             if (lKey) {
                 reports.idrg[monthKey][`${lKey}_c`]++;
                 reports.idrg[monthKey][`${lKey}_t`] += tarifIdrgRaw;
             }
        }
        if (topUp > 0) {
             reports.idrg[monthKey].topup_c++;
             reports.idrg[monthKey].topup_t += topUp;
        }
        reports.idrg[monthKey].total_c++;
        
        if (!isUngroupable && drgCode) {
            const reportDrg = isRI ? reports.idrg_ri : reports.idrg_rj;
            if (!reportDrg[drgCode]) {
                reportDrg[drgCode] = { drgCode, drgDesc, cases: 0, tRs: 0, tIna: 0, tIdrg: 0 };
            }
            reportDrg[drgCode].cases++;
            reportDrg[drgCode].tRs += tarifRs;
            reportDrg[drgCode].tIna += tarif;
            reportDrg[drgCode].tIdrg += tarifIdrgRaw;
        }
        
        const gab = reports.gabungan[monthKey];
        if (isUngroupable) gab.ungroup_c++;
        
        if (isRI) {
            gab.ri_tRs += tarifRs;
            gab.inacbg_ri_c++;
            gab.inacbg_ri_t += tarif;
            gab.idrg_ri_c++;
            gab.idrg_ri_t += tarifIdrgRaw;
        } else {
            gab.rj_tRs += tarifRs;
            gab.inacbg_rj_c++;
            gab.inacbg_rj_t += tarif;
            gab.idrg_rj_c++;
            gab.idrg_rj_t += tarifIdrgRaw;
        }
        
        if (anyOutside) {
            patientsOutsideCompetency++;
            tarifOutsideCompetency += tarifIdrgRaw;
            if (gapAnomalies.length < 100) {
                gapAnomalies.push({ mrn, sep, nama: patientName, diagnosa: diaglist.join('; '), missingCompetencies });
            }
        } else {
            patientsWithinCompetency++;
            tarifWithinCompetency += tarifIdrgRaw;
        }
    }
    
    fs.unlinkSync(filePath);
    
    for (const g of Object.values(mdcMap)) {
        for (const lvl of ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA']) {
            if (g.comps && g.comps[lvl] && g.comps[lvl].icds) {
                g.comps[lvl].icds = Object.values(g.comps[lvl].icds).sort((a,b) => b.count - a.count);
            }
        }
    }
    
    for (const d of Object.values(dpjpMap)) {
        if (d.comps) {
            for (const c of Object.values(d.comps)) {
                if (c.levels) {
                    for (const lvl of ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA']) {
                        if (c.levels[lvl] && c.levels[lvl].icds) {
                            c.levels[lvl].icds = Object.values(c.levels[lvl].icds).sort((a,b) => b.count - a.count);
                        }
                    }
                }
            }
        }
    }
    
    const kelompokLayananData = Object.values(mdcMap).sort((a, b) => {
        if (a.name === "KASUS BELUM MAPPING") return 1;
        if (b.name === "KASUS BELUM MAPPING") return -1;
        return b.count - a.count;
    });
    
    const gabSorted = Object.values(reports.gabungan).sort((a,b) => a.monthKey.localeCompare(b.monthKey));
    let monthlyArray = gabSorted.map(g => {
        return {
            label: g.monthKey,
            tarifRs: g.ri_tRs + g.rj_tRs,
            inacbg: g.inacbg_ri_t + g.inacbg_rj_t,
            idrg: g.idrg_ri_t + g.idrg_rj_t,
            selisih: (g.idrg_ri_t + g.idrg_rj_t) - (g.inacbg_ri_t + g.inacbg_rj_t)
        }
    });

    const finalReports = {
        inaCbg: Object.values(reports.inaCbg).sort((a,b) => a.monthKey.localeCompare(b.monthKey)),
        idrg: Object.values(reports.idrg).sort((a,b) => a.monthKey.localeCompare(b.monthKey)),
        idrg_ri: Object.values(reports.idrg_ri).sort((a,b) => a.drgCode.localeCompare(b.drgCode)),
        idrg_rj: Object.values(reports.idrg_rj).sort((a,b) => a.drgCode.localeCompare(b.drgCode)),
        gabungan: gabSorted,
        ungroupable: reports.ungroupable,
        unmapped: reports.unmapped
    };
    
    // Sort Top 10 Maps
    const getTopIcd = (obj) => Object.entries(obj).sort((a,b) => b[1] - a[1]).slice(0,10).map(e => ({ code: e[0], count: e[1], desc: icdDescMap.get(e[0]) || '' }));
    const getTop10Selisih = (obj) => Object.entries(obj)
        .filter(e => e[1].count > 0 && e[1].selisihTotal > 0)
        .sort((a,b) => b[1].selisihTotal - a[1].selisihTotal)
        .slice(0, 10).map(e => ({ code: e[0], desc: e[1].desc, count: e[1].count, selisihVsRs: e[1].selisihTotal }));

    const dpjpDataArray = Object.values(dpjpMap).sort((a, b) => b.count - a.count);

    const finalResponse = {
        summary: {
            totalPatients,
            patientsWithinCompetency,
            patientsOutsideCompetency,
            totalTarifInacbg,
            tarifWithinCompetency,
            tarifOutsideCompetency
        },
        kpis: {
            totalCases: totalPatients,
            totalTarifInacbg: totalTarifInacbg,
            totalTarifIdrg: totalTarifIdrgRaw
        },
        dashboard: {
            ranapCount,
            totalRows: totalPatients,
            tRs: totalTarifRs,
            tIna: totalTarifInacbg,
            tIdrg: totalTarifIdrgRaw,
            cInaHigh, cIdrgHigh, cEq,
            dischargeStats,
            monthlyArray,
            selisihTotal: totalTarifIdrgRaw - totalTarifInacbg,
            rataIna: totalPatients ? (totalTarifInacbg / totalPatients) : 0,
            rataIdrg: totalPatients ? (totalTarifIdrgRaw / totalPatients) : 0,
            topDiagUtama: getTopIcd(diagUtamaFreq),
            topDiagSekunder: getTopIcd(diagSekunderFreq),
            topProc: getTopIcd(procFreq),
            topSurplusIna: getTop10Selisih(inaSurplus),
            topDefisitIna: getTop10Selisih(inaDefisit),
            topSurplus: getTop10Selisih(idrgSurplus),
            topDefisit: getTop10Selisih(idrgDefisit),
            severityStats: severityStats,
            complexityStats: complexityStats
        },
        anomalies: gapAnomalies,
        reports: finalReports,
        kelompokLayananData,
        dpjpData: dpjpDataArray
    };

    if (isAppend && lastAnalysisResult) {
        const prev = lastAnalysisResult.dashboard || {};
        const curr = finalResponse.dashboard;
        const prevSum = lastAnalysisResult.summary || {};
        const currSum = finalResponse.summary;

        // Merge summary KPIs
        currSum.totalPatients += prevSum.totalPatients || 0;
        currSum.patientsWithinCompetency += prevSum.patientsWithinCompetency || 0;
        currSum.patientsOutsideCompetency += prevSum.patientsOutsideCompetency || 0;
        currSum.totalTarifInacbg += prevSum.totalTarifInacbg || 0;
        currSum.tarifWithinCompetency += prevSum.tarifWithinCompetency || 0;
        currSum.tarifOutsideCompetency += prevSum.tarifOutsideCompetency || 0;
        
        finalResponse.kpis.totalCases = currSum.totalPatients;
        finalResponse.kpis.totalTarifInacbg = currSum.totalTarifInacbg;
        
        // Merge dashboard KPIs
        curr.totalRows = currSum.totalPatients;
        curr.ranapCount += prev.ranapCount || 0;
        curr.tIna += prev.tIna || 0;
        curr.tIdrg += prev.tIdrg || 0;
        curr.tRs += prev.tRs || 0;
        curr.selisihTotal = curr.tIdrg - curr.tIna;
        curr.rataIna = curr.totalRows ? curr.tIna / curr.totalRows : 0;
        curr.rataIdrg = curr.totalRows ? curr.tIdrg / curr.totalRows : 0;
        curr.cInaHigh = (curr.cInaHigh || 0) + (prev.cInaHigh || 0);
        curr.cIdrgHigh = (curr.cIdrgHigh || 0) + (prev.cIdrgHigh || 0);
        curr.cEq = (curr.cEq || 0) + (prev.cEq || 0);

        // Merge severity & complexity
        Object.keys(prev.severityStats || {}).forEach(k => {
            curr.severityStats[k] = (curr.severityStats[k] || 0) + (prev.severityStats[k] || 0);
        });
        Object.keys(prev.complexityStats || {}).forEach(k => {
            curr.complexityStats[k] = (curr.complexityStats[k] || 0) + (prev.complexityStats[k] || 0);
        });

        // Merge discharge stats
        Object.keys(prev.dischargeStats || {}).forEach(k => {
            curr.dischargeStats[k] = (curr.dischargeStats[k] || 0) + (prev.dischargeStats[k] || 0);
        });

        // Merge monthly reports
        const prevReports = lastAnalysisResult.reports || {};
        const currReports = finalResponse.reports || {};
        ['inaCbg', 'idrg', 'gabungan'].forEach(rType => {
            if (prevReports[rType] && Array.isArray(prevReports[rType])) {
                prevReports[rType].forEach(pItem => {
                    const cItem = currReports[rType].find(c => c.monthKey === pItem.monthKey);
                    if (cItem) {
                        Object.keys(pItem).forEach(f => {
                            if (typeof pItem[f] === 'number') {
                                cItem[f] = (cItem[f] || 0) + pItem[f];
                            }
                        });
                    } else {
                        currReports[rType].push({ ...pItem });
                    }
                });
                currReports[rType].sort((a,b) => a.monthKey.localeCompare(b.monthKey));
            }
        });
        
        ['idrg_ri', 'idrg_rj'].forEach(rType => {
            if (prevReports[rType] && Array.isArray(prevReports[rType])) {
                prevReports[rType].forEach(pItem => {
                    const cItem = currReports[rType].find(c => c.drgCode === pItem.drgCode);
                    if (cItem) {
                        cItem.cases = (cItem.cases || 0) + (pItem.cases || 0);
                        cItem.tRs = (cItem.tRs || 0) + (pItem.tRs || 0);
                        cItem.tIna = (cItem.tIna || 0) + (pItem.tIna || 0);
                        cItem.tIdrg = (cItem.tIdrg || 0) + (pItem.tIdrg || 0);
                    } else {
                        currReports[rType].push({ ...pItem });
                    }
                });
                currReports[rType].sort((a,b) => a.drgCode.localeCompare(b.drgCode));
            }
        });
        
        curr.monthlyArray = currReports.gabungan.map(g => ({
            label: g.monthKey,
            tarifRs: g.ri_tRs + g.rj_tRs,
            inacbg: g.inacbg_ri_t + g.inacbg_rj_t,
            idrg: g.idrg_ri_t + g.idrg_rj_t,
            selisih: (g.idrg_ri_t + g.idrg_rj_t) - (g.inacbg_ri_t + g.inacbg_rj_t)
        }));

        // Merge kelompok layanan
        const prevK = lastAnalysisResult.kelompokLayananData || [];
        const currK = finalResponse.kelompokLayananData;
        currK.forEach(cItem => {
             const pItem = prevK.find(p => p.name === cItem.name);
             if (pItem) {
                 cItem.count += pItem.count || 0;
                 cItem.tInacbg += pItem.tInacbg || 0;
                 cItem.tIdrg += pItem.tIdrg || 0;
                 cItem.sesuai_c += pItem.sesuai_c || 0;
                 cItem.sesuai_t += pItem.sesuai_t || 0;
                 cItem.sesuai_ina += pItem.sesuai_ina || 0;
                 cItem.tidak_sesuai_c += pItem.tidak_sesuai_c || 0;
                 cItem.tidak_sesuai_t += pItem.tidak_sesuai_t || 0;
                 cItem.tidak_sesuai_ina += pItem.tidak_sesuai_ina || 0;
                 
                 ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA'].forEach(lvl => {
                     if (pItem.comps && pItem.comps[lvl]) {
                         cItem.comps[lvl].count += pItem.comps[lvl].count || 0;
                         cItem.comps[lvl].tIna += pItem.comps[lvl].tIna || 0;
                         cItem.comps[lvl].tIdrg += pItem.comps[lvl].tIdrg || 0;
                         
                         const cIcds = cItem.comps[lvl].icds || [];
                         const pIcds = pItem.comps[lvl].icds || [];
                         
                         pIcds.forEach(pIcd => {
                             const existing = cIcds.find(c => c.code === pIcd.code);
                             if (existing) {
                                 existing.count += pIcd.count || 0;
                                 existing.tIna += pIcd.tIna || 0;
                                 existing.tIdrg += pIcd.tIdrg || 0;
                                 existing.loss += pIcd.loss || 0;
                             } else {
                                 cIcds.push({ ...pIcd });
                             }
                         });
                         cIcds.sort((a,b) => b.count - a.count);
                         cItem.comps[lvl].icds = cIcds;
                     }
                 });
             }
        });
        // Add any missing prev items into curr (both kelompokLayanan and DPJP)
        prevK.forEach(pItem => {
            if (!currK.find(c => c.name === pItem.name)) {
                currK.push(JSON.parse(JSON.stringify(pItem)));
            }
        });
        currK.sort((a,b) => {
            if (a.name === "KASUS BELUM MAPPING") return 1;
            if (b.name === "KASUS BELUM MAPPING") return -1;
            return b.count - a.count;
        });
        
        // Merge dpjp
        const prevDpjp = lastAnalysisResult.dpjpData || [];
        const currDpjp = finalResponse.dpjpData || [];
        
        prevDpjp.forEach(pItem => {
            if (!currDpjp.find(c => c.name === pItem.name)) {
                currDpjp.push(JSON.parse(JSON.stringify(pItem)));
            }
        });
        
        currDpjp.forEach(cItem => {
            const pItem = prevDpjp.find(p => p.name === cItem.name);
            if (pItem) {
                cItem.count += pItem.count || 0;
                cItem.sesuai_c += pItem.sesuai_c || 0;
                cItem.sesuai_t += pItem.sesuai_t || 0;
                cItem.sesuai_ina += pItem.sesuai_ina || 0;
                cItem.tidak_sesuai_c += pItem.tidak_sesuai_c || 0;
                cItem.tidak_sesuai_t += pItem.tidak_sesuai_t || 0;
                cItem.tidak_sesuai_ina += pItem.tidak_sesuai_ina || 0;
                
                if (pItem.comps) {
                    Object.keys(pItem.comps).forEach(gName => {
                        if (!cItem.comps[gName]) {
                            cItem.comps[gName] = JSON.parse(JSON.stringify(pItem.comps[gName]));
                        } else {
                            const cG = cItem.comps[gName];
                            const pG = pItem.comps[gName];
                            cG.count += pG.count || 0;
                            cG.sesuai_c += pG.sesuai_c || 0;
                            cG.sesuai_t += pG.sesuai_t || 0;
                            cG.sesuai_ina += pG.sesuai_ina || 0;
                            cG.tidak_sesuai_c += pG.tidak_sesuai_c || 0;
                            cG.tidak_sesuai_t += pG.tidak_sesuai_t || 0;
                            cG.tidak_sesuai_ina += pG.tidak_sesuai_ina || 0;
                            
                            ['BELUM_ADA_MAPPING', 'DASAR', 'MADYA', 'UTAMA', 'PARIPURNA'].forEach(lvl => {
                                if (pG.levels && pG.levels[lvl] && cG.levels && cG.levels[lvl]) {
                                    cG.levels[lvl].count += pG.levels[lvl].count || 0;
                                    cG.levels[lvl].tIna += pG.levels[lvl].tIna || 0;
                                    cG.levels[lvl].tIdrg += pG.levels[lvl].tIdrg || 0;
                                    
                                    const cIcds = cG.levels[lvl].icds || [];
                                    const pIcds = pG.levels[lvl].icds || [];
                                    
                                    pIcds.forEach(pIcd => {
                                        const cIcd = cIcds.find(x => x.code === pIcd.code);
                                        if (cIcd) {
                                            cIcd.count += pIcd.count || 0;
                                            cIcd.tIna += pIcd.tIna || 0;
                                            cIcd.tIdrg += pIcd.tIdrg || 0;
                                            cIcd.loss += pIcd.loss || 0;
                                        } else {
                                            cIcds.push(JSON.parse(JSON.stringify(pIcd)));
                                        }
                                    });
                                    cIcds.sort((a,b) => b.count - a.count);
                                    cG.levels[lvl].icds = cIcds;
                                }
                            });
                        }
                    });
                }
            }
        });
        currDpjp.sort((a,b) => b.count - a.count);

        // Merge anomalies
        finalResponse.anomalies = [...(finalResponse.anomalies || []), ...(lastAnalysisResult.anomalies || [])];
    }

    lastAnalysisResult = finalResponse;
    res.json(finalResponse);
};
