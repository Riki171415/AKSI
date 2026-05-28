import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import XlsxPopulate from 'xlsx-populate/browser/xlsx-populate';

export const exportToExcel = async (workbookName, sheets, password = null) => {
    try {
        const workbook = new ExcelJS.Workbook();
        
        for (const sheet of sheets) {
            const ws = workbook.addWorksheet(sheet.name);
            
            if (sheet.columns) {
                ws.columns = sheet.columns;
            }
            
            if (sheet.data) {
                sheet.data.forEach(row => ws.addRow(row));
            }
            
            // Format header row
            ws.getRow(1).font = { bold: true };
            ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
            
            // If there's an image element id to capture
            if (sheet.chartElementId) {
                const el = document.getElementById(sheet.chartElementId);
                if (el) {
                    const canvas = await html2canvas(el);
                    const base64Image = canvas.toDataURL('image/png');
                    
                    const imageId = workbook.addImage({
                        base64: base64Image,
                        extension: 'png',
                    });
                    
                    ws.addRow([]);
                    ws.addRow(['--- GRAFIK ---']);
                    
                    const lastRow = ws.lastRow.number + 1;
                    ws.addImage(imageId, {
                        tl: { col: 1, row: lastRow },
                        ext: { width: canvas.width * 0.75, height: canvas.height * 0.75 }
                    });
                }
            }
        }
        
        // Generate ExcelJS buffer
        const excelBuffer = await workbook.xlsx.writeBuffer();

        if (password) {
            // Encrypt with xlsx-populate (real file-open password)
            const populateWb = await XlsxPopulate.fromDataAsync(excelBuffer);
            const encryptedBuffer = await populateWb.outputAsync({ password });
            saveAs(new Blob([encryptedBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${workbookName}.xlsx`);
        } else {
            saveAs(new Blob([excelBuffer]), `${workbookName}.xlsx`);
        }
    } catch (err) {
        console.error("Excel export error:", err);
        alert("Gagal mengekspor Excel: " + err.message);
    }
};

export const exportChartToPNG = async (elementId, fileName) => {
    try {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const canvas = await html2canvas(el);
        const dataUrl = canvas.toDataURL('image/png');
        saveAs(dataUrl, `${fileName}.png`);
    } catch (err) {
        console.error("PNG export error:", err);
        alert("Gagal menyimpan PNG: " + err.message);
    }
};
