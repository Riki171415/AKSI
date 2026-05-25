const multer = require('multer');
const fs = require('fs');
const readline = require('readline');
const { icdMap } = require('../utils/csvLoader');
const { hospitalSettings } = require('../store');

const upload = multer({ dest: 'uploads/' });

exports.uploadMiddleware = upload.single('file');

exports.analyzeTxt = async (req, res) => {
    const kodeRs = req.user.kodeRs;
    const settings = hospitalSettings.get(kodeRs) || { competencies: [] };
    const myCompetencies = new Set(settings.competencies);
    
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
        
        let patientNeededCompetencies = new Set();
        
        for (const icd of allIcds) {
            const cleanIcd = icd.trim();
            // Try exact match
            let needed = icdMap.get(cleanIcd);
            // Try without dots
            if (!needed) needed = icdMap.get(cleanIcd.replace('.', ''));
            // Try prefix (e.g. A15 for A15.0)
            if (!needed && cleanIcd.includes('.')) needed = icdMap.get(cleanIcd.split('.')[0]);
            
            if (needed) {
                needed.forEach(c => patientNeededCompetencies.add(c));
            }
        }
        
        totalPatients++;
        
        let isOutside = false;
        let missingCompetencies = [];
        
        for (const comp of patientNeededCompetencies) {
            requiredCompetenciesCount[comp] = (requiredCompetenciesCount[comp] || 0) + 1;
            if (!myCompetencies.has(comp)) {
                isOutside = true;
                missingCompetencies.push(comp);
            }
        }
        
        if (isOutside) {
            patientsOutsideCompetency++;
            if (gapAnomalies.length < 100) { // Keep up to 100
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
    
    // Clean up file
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
