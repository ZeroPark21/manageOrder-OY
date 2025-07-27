const XLSX = require('xlsx');
const path = require('path');

// Read both Excel files
const newFilePath = path.join(__dirname, '../data/creative data for product campaigns 2025-07-20 00 ~ 2025-07-26 20.xlsx');
const oldFilePath = path.join(__dirname, '../data/Creative data 2025-05-12 - 2025-06-22 - Product 1730837453039702652 (1).xlsx');

const newWorkbook = XLSX.readFile(newFilePath);
const oldWorkbook = XLSX.readFile(oldFilePath);

// Get the first worksheet from each
const newSheet = newWorkbook.Sheets[newWorkbook.SheetNames[0]];
const oldSheet = oldWorkbook.Sheets[oldWorkbook.SheetNames[0]];

// Convert to JSON
const newData = XLSX.utils.sheet_to_json(newSheet);
const oldData = XLSX.utils.sheet_to_json(oldSheet);

// Get column names
const newColumns = newData.length > 0 ? Object.keys(newData[0]) : [];
const oldColumns = oldData.length > 0 ? Object.keys(oldData[0]) : [];

console.log('=== COLUMN COMPARISON ===');
console.log('\nOLD FILE columns:');
oldColumns.forEach((col, index) => {
  console.log(`${index + 1}. "${col}"`);
});

console.log('\nNEW FILE columns:');
newColumns.forEach((col, index) => {
  console.log(`${index + 1}. "${col}"`);
});

// Find new columns
const newlyAddedColumns = newColumns.filter(col => !oldColumns.includes(col));
const removedColumns = oldColumns.filter(col => !newColumns.includes(col));

console.log('\n=== CHANGES ===');
if (newlyAddedColumns.length > 0) {
  console.log('\nNEW COLUMNS ADDED:');
  newlyAddedColumns.forEach(col => {
    console.log(`+ "${col}"`);
  });
} else {
  console.log('\nNo new columns added.');
}

if (removedColumns.length > 0) {
  console.log('\nCOLUMNS REMOVED:');
  removedColumns.forEach(col => {
    console.log(`- "${col}"`);
  });
} else {
  console.log('\nNo columns removed.');
}

// Check for campaign-related data
console.log('\n=== CAMPAIGN DATA ANALYSIS ===');
console.log('\nUnique Campaign Names in NEW file:');
const campaignNames = [...new Set(newData.map(row => row['Campaign name']).filter(val => val))];
campaignNames.forEach(name => {
  console.log(`- ${name}`);
});

console.log('\nUnique Campaign IDs in NEW file:');
const campaignIds = [...new Set(newData.map(row => row['Campaign ID']).filter(val => val))];
campaignIds.forEach(id => {
  console.log(`- ${id}`);
});