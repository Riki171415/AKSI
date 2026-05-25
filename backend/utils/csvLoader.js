const fs = require('fs');
const path = require('path');

let icdMap = new Map(); // ICD -> Set of Competencies
let competencies = new Set();

function loadCSV() {
    const csvPath = path.join(__dirname, '..', 'data', 'ICD Kompetensi Layanan.csv');
    if (!fs.existsSync(csvPath)) {
        console.error("CSV file not found at", csvPath);
        return;
    }
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    
    for (let line of lines) {
        if (!line.match(/^\d+;/)) continue; 
        
        const parts = line.split(';');
        if (parts.length >= 4) {
            const groupName = parts[2].trim();
            const icdCode = parts[3].replace(/["']/g, '').trim();
            
            competencies.add(groupName);
            
            if (!icdMap.has(icdCode)) {
                icdMap.set(icdCode, new Set());
            }
            icdMap.get(icdCode).add(groupName);
        }
    }
    console.log(`Loaded ${icdMap.size} unique ICD codes and ${competencies.size} competencies.`);
}

loadCSV();

module.exports = { icdMap, competencies: Array.from(competencies).sort() };
