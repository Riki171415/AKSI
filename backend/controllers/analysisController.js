const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { icdMap } = require('../utils/csvLoader');
const { hospitalSettings } = require('../store');

const upload = multer({ dest: 'uploads/' });

exports.uploadMiddleware = upload.single('file');

const levelValues = {
    "Dasar": 1,
    "Madya": 2,
    "Utama": 3,
    "Paripurna": 4
};

exports.analyzeTxt = async (req, res) => {
    const kodeRs = req.user.kodeRs;
    const settings = hospitalSettings.get(kodeRs) || { competencies: {} };
    const myCompetencies = settings.competencies; 
    
    if (!req.file) {
        return res.status(400).json({ message: 'File tidak ditemukan' });
    }
    
    const filePath = req.file.path;
    
    let totalPatients = 0;
    let patientsWithinCompetency = 0;
    let patientsOutsideCompetency = 0;
    let totalTarifInacbg = 0;
    let tarifWithinCompetency = 0;
    let tarifOutsideCompetency = 0;
    let requiredCompetenciesCount = {};
    let gapAnomalies = [];
    let reportMap = {};
    
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });
    
    let isHeader = true;
    let headers = [];
    
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
        
        if (diagIdx === -1) continue;
        
        const diaglist = (columns[diagIdx] || '').split(';');
        const proclist = procIdx !== -1 ? (columns[procIdx] || '').split(';') : [];
        const patientName = nameIdx !== -1 ? columns[nameIdx] : 'Unknown';
        const mrn = mrnIdx !== -1 ? columns[mrnIdx] : 'Unknown';
        const sep = sepIdx !== -1 ? columns[sepIdx] : 'Unknown';
        
        const dateStr = dateIdx !== -1 ? columns[dateIdx] : '';
        let monthKey = "Unknown";
        if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            if (parts.length >= 3) monthKey = parts[2] + '-' + parts[1]; // DD/MM/YYYY -> YYYY-MM
        } else if (dateStr.includes('-')) {
            const parts = dateStr.split('-');
            if (parts.length >= 3) monthKey = parts[0] + '-' + parts[1]; // YYYY-MM-DD -> YYYY-MM
        }
        
        const tarifValStr = (tarifIdx !== -1 && columns[tarifIdx]) ? columns[tarifIdx] : ((tarifRsIdx !== -1 && columns[tarifRsIdx]) ? columns[tarifRsIdx] : "0");
        const tarif = parseFloat(tarifValStr) || 0;
        
        const allIcds = [...diaglist, ...proclist].filter(c => c.trim());
        
        let patientNeededCompetencies = [];
        
        for (const icd of allIcds) {
            const cleanIcd = icd.trim();
            let needed = icdMap.get(cleanIcd) || icdMap.get(cleanIcd.replace('.', ''));
            if (!needed && cleanIcd.includes('.')) needed = icdMap.get(cleanIcd.split('.')[0]);
            
            if (needed) {
                needed.forEach(n => patientNeededCompetencies.push(n));
            }
        }
        
        totalPatients++;
        totalTarifInacbg += tarif;
        
        let isOutside = false;
        let missingCompetencies = [];
        let missingSet = new Set();
        
        let maxLevelInt = 1; // Default to Dasar
        let maxLevelStr = "Dasar";
        
        for (const reqComp of patientNeededCompetencies) {
            const groupName = reqComp.group;
            const reqLevel = reqComp.level;
            const reqLevelInt = reqComp.levelInt;
            
            if (reqLevelInt > maxLevelInt) {
                maxLevelInt = reqLevelInt;
                maxLevelStr = reqLevel;
            }
            
            requiredCompetenciesCount[groupName] = (requiredCompetenciesCount[groupName] || 0) + 1;
            
            const rsLevelStr = myCompetencies[groupName];
            const rsLevelInt = rsLevelStr ? (levelValues[rsLevelStr] || 0) : 0;
            
            if (rsLevelInt < reqLevelInt) {
                isOutside = true;
                const msg = `${groupName} (Butuh: ${reqLevel})`;
                if (!missingSet.has(msg)) {
                    missingSet.add(msg);
                    missingCompetencies.push(msg);
                }
            }
        }
        
        // Reporting aggregation
        if (!reportMap[monthKey]) {
            reportMap[monthKey] = {
                _id: monthKey,
                idrg_dasar_c: 0, idrg_dasar_t: 0,
                idrg_madya_c: 0, idrg_madya_t: 0,
                idrg_utama_c: 0, idrg_utama_t: 0,
                idrg_pari_c: 0, idrg_pari_t: 0,
                idrg_topup_c: 0, idrg_topup_t: 0
            };
        }
        
        let mappedLevel = maxLevelStr.toLowerCase();
        if (mappedLevel === 'paripurna') mappedLevel = 'pari';
        
        if (reportMap[monthKey][`idrg_${mappedLevel}_c`] !== undefined) {
            reportMap[monthKey][`idrg_${mappedLevel}_c`]++;
            reportMap[monthKey][`idrg_${mappedLevel}_t`] += tarif;
        }
        
        if (isOutside) {
            patientsOutsideCompetency++;
            tarifOutsideCompetency += tarif;
            if (gapAnomalies.length < 100) {
                gapAnomalies.push({
                    mrn,
                    sep,
                    nama: patientName,
                    diagnosa: allIcds.join('; '),
                    missingCompetencies
                });
            }
        } else {
            patientsWithinCompetency++;
            tarifWithinCompetency += tarif;
        }
    }
    
    fs.unlinkSync(filePath);
    
    const reportsArray = Object.values(reportMap).sort((a, b) => a._id.localeCompare(b._id));
    
    res.json({
        summary: {
            totalPatients,
            patientsWithinCompetency,
            patientsOutsideCompetency,
            totalTarifInacbg,
            tarifWithinCompetency,
            tarifOutsideCompetency
        },
        competencyStats: requiredCompetenciesCount,
        anomalies: gapAnomalies,
        reports: reportsArray
    });
};
