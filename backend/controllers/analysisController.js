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
    let requiredCompetenciesCount = {};
    let gapAnomalies = [];
    
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
        
        if (diagIdx === -1) continue;
        
        const diaglist = (columns[diagIdx] || '').split(';');
        const proclist = procIdx !== -1 ? (columns[procIdx] || '').split(';') : [];
        const patientName = nameIdx !== -1 ? columns[nameIdx] : 'Unknown';
        const mrn = mrnIdx !== -1 ? columns[mrnIdx] : 'Unknown';
        const sep = sepIdx !== -1 ? columns[sepIdx] : 'Unknown';
        
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
        
        let isOutside = false;
        let missingCompetencies = [];
        let missingSet = new Set();
        
        for (const reqComp of patientNeededCompetencies) {
            const groupName = reqComp.group;
            const reqLevel = reqComp.level;
            const reqLevelInt = reqComp.levelInt;
            
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
        
        if (isOutside) {
            patientsOutsideCompetency++;
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
        }
    }
    
    fs.unlinkSync(filePath);
    
    res.json({
        summary: {
            totalPatients,
            patientsWithinCompetency,
            patientsOutsideCompetency
        },
        competencyStats: requiredCompetenciesCount,
        anomalies: gapAnomalies
    });
};
