const xlsx = require('xlsx');

const filePath = 'D:\\AKSI-APCI\\V5 Template Perbandingan INA CBGs dan I DRG.xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  const sheetNames = workbook.SheetNames;
  
  console.log("=== EXCEL TEMPLATE STRUCTURE ===");
  sheetNames.forEach(sheetName => {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const worksheet = workbook.Sheets[sheetName];
    // Convert first 15 rows to JSON to see the structure
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    for (let i = 0; i < Math.min(15, data.length); i++) {
        // Only print rows that have some content
        if (data[i].some(cell => cell !== '')) {
            console.log(`Row ${i+1}:`, data[i].slice(0, 15).join(' | '));
        }
    }
  });
} catch (e) {
  console.error("Error reading excel file:", e.message);
}
