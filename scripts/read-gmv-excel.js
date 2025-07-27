const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the Excel file
const filePath = path.join(__dirname, '../data/Creative data 2025-05-12 - 2025-06-22 - Product 1730837453039702652 (1).xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first worksheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

// Print first 5 rows to see the structure
console.log('Total rows:', data.length);
console.log('\nFirst 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// Print column names
if (data.length > 0) {
  console.log('\nColumn names:');
  console.log(Object.keys(data[0]));
}

// Save as JSON for easier use
const outputPath = path.join(__dirname, '../data/gmv-data.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
console.log('\nData saved to:', outputPath);