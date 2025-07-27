const XLSX = require('xlsx');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '../data/creative data for product campaigns 2025-07-20 00 ~ 2025-07-26 20.xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first worksheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('=== EXCEL FILE ANALYSIS ===');
console.log('File:', 'creative data for product campaigns 2025-07-20 00 ~ 2025-07-26 20.xlsx');
console.log('Total rows:', data.length);
console.log('Sheet name:', sheetName);

// Print column names
if (data.length > 0) {
  console.log('\n=== COLUMN NAMES ===');
  const columns = Object.keys(data[0]);
  columns.forEach((col, index) => {
    console.log(`${index + 1}. "${col}"`);
  });
  
  console.log('\n=== SAMPLE DATA (First 3 rows) ===');
  data.slice(0, 3).forEach((row, index) => {
    console.log(`\n--- Row ${index + 1} ---`);
    Object.entries(row).forEach(([key, value]) => {
      console.log(`${key}: ${value} (${typeof value})`);
    });
  });
  
  console.log('\n=== DATA TYPES AND SAMPLE VALUES ===');
  const sampleRow = data[0];
  Object.entries(sampleRow).forEach(([key, value]) => {
    let dataType = typeof value;
    let sampleValues = [];
    
    // Get unique sample values from first 10 rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const val = data[i][key];
      if (val && !sampleValues.includes(val)) {
        sampleValues.push(val);
        if (sampleValues.length >= 3) break;
      }
    }
    
    console.log(`\n"${key}":`);
    console.log(`  Type: ${dataType}`);
    console.log(`  Samples: ${sampleValues.join(', ')}`);
  });
  
  // Check for campaign-related fields
  console.log('\n=== CAMPAIGN-RELATED FIELDS ===');
  const campaignFields = columns.filter(col => 
    col.toLowerCase().includes('campaign') || 
    col.toLowerCase().includes('광고') ||
    col.toLowerCase().includes('프로모션') ||
    col.toLowerCase().includes('promotion')
  );
  
  if (campaignFields.length > 0) {
    console.log('Found campaign-related fields:');
    campaignFields.forEach(field => {
      console.log(`- "${field}"`);
      // Show unique values for campaign fields
      const uniqueValues = [...new Set(data.map(row => row[field]).filter(val => val))];
      console.log(`  Unique values (first 5): ${uniqueValues.slice(0, 5).join(', ')}`);
    });
  } else {
    console.log('No obvious campaign-related fields found in column names.');
  }
  
  // Check for date fields
  console.log('\n=== DATE FIELDS ===');
  const dateFields = columns.filter(col => 
    col.toLowerCase().includes('date') || 
    col.toLowerCase().includes('날짜') ||
    col.toLowerCase().includes('일자') ||
    col.toLowerCase().includes('time')
  );
  
  if (dateFields.length > 0) {
    console.log('Found date-related fields:');
    dateFields.forEach(field => {
      console.log(`- "${field}"`);
      const sampleDate = data[0][field];
      console.log(`  Sample: ${sampleDate}`);
    });
  }
}