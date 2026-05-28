const fs = require('fs');
const path = require('path');

let icdMap = new Map(); // ICD -> Array of { group, level, levelInt }
let icdDescMap = new Map(); // ICD -> Description
let competencies = new Set();

const levelValues = {
    "Dasar": 1,
    "Madya": 2,
    "Utama": 3,
    "Paripurna": 4
};

function loadCSV() {
    // Try multiple paths for Vercel serverless compatibility
    const possiblePaths = [
        path.join(__dirname, '..', 'data', 'ICD Kompetensi Layanan.csv'),
        path.join(__dirname, 'data', 'ICD Kompetensi Layanan.csv'),
        path.join(process.cwd(), 'api', 'data', 'ICD Kompetensi Layanan.csv'),
        path.join(process.cwd(), 'data', 'ICD Kompetensi Layanan.csv'),
    ];
    
    let csvPath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) { csvPath = p; break; }
    }
    
    if (!csvPath) {
        console.error("CSV file not found. Tried:", possiblePaths);
        return;
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    for (let line of lines) {
        if (!line.match(/^\d+;/)) continue; 
        
        const parts = line.split(';');
        if (parts.length >= 6) {
            const groupName = parts[2].trim();
            const icdCode = parts[3].replace(/["']/g, '').trim();
            const icdDesc = parts[4].replace(/["']/g, '').trim();
            const levelRaw = parts[5].replace(/["']/g, '').trim();
            
            const level = levelRaw.charAt(0).toUpperCase() + levelRaw.slice(1).toLowerCase();
            const levelInt = levelValues[level] || 1;
            
            competencies.add(groupName);
            
            if (!icdMap.has(icdCode)) {
                icdMap.set(icdCode, []);
            }
            if (!icdDescMap.has(icdCode) && icdDesc) {
                icdDescMap.set(icdCode, icdDesc);
            }
            
            const existing = icdMap.get(icdCode);
            if (!existing.find(e => e.group === groupName)) {
                existing.push({ group: groupName, level: level, levelInt: levelInt });
            }
        }
    }
    console.log(`Loaded ${icdMap.size} unique ICD codes and ${competencies.size} competencies.`);
}

loadCSV();

module.exports = { icdMap, icdDescMap, competencies: Array.from(competencies).sort() };
