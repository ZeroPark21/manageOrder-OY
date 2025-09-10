const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the exact Excel file
const filePath = path.join(__dirname, '..', 'data', 'Video_List_20250604-20250831_20250902023532.xlsx');

console.log('Reading file:', filePath);
console.log('File modified date:', fs.statSync(filePath).mtime);
console.log('\n');

try {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  console.log('Total rows in Excel:', data.length);
  
  // Filter @annekoii data
  const annekoiiData = data.filter(row => {
    const creator = row['Creator username'] || '';
    return creator.toLowerCase() === 'annekoii' || creator === '@annekoii';
  });

  console.log('Total @annekoii records:', annekoiiData.length);
  console.log('\n=== ALL @annekoii Records ===\n');
  
  let totalLikes = 0;
  let totalComments = 0;
  let totalGMV = 0;
  let totalCommission = 0;
  
  annekoiiData.forEach((row, index) => {
    const likes = Number(row['Shoppable video likes']) || 0;
    const comments = Number(row['Shoppable video comments']) || 0;
    const gmv = Number(row['GMV']) || 0;
    const commission = Number(row['Est. commission']) || 0;
    
    console.log(`${index + 1}. ${row['Video name']?.substring(0, 40)}...`);
    console.log(`   Date: ${row['Video post date']}`);
    console.log(`   Likes: ${likes}, Comments: ${comments}`);
    console.log(`   GMV: $${gmv}, Commission: $${commission}`);
    console.log('');
    
    totalLikes += likes;
    totalComments += comments;
    totalGMV += gmv;
    totalCommission += commission;
  });
  
  console.log('=== TOTALS ===');
  console.log(`Total Likes: ${totalLikes}`);
  console.log(`Total Comments: ${totalComments}`);
  console.log(`Total GMV: $${totalGMV.toFixed(2)}`);
  console.log(`Total Commission: $${totalCommission.toFixed(2)}`);
  
  // Check for any variations in creator name
  console.log('\n=== Checking all creator name variations ===');
  const creatorVariations = {};
  data.forEach(row => {
    const creator = row['Creator username'] || '';
    if (creator.toLowerCase().includes('annekoii')) {
      creatorVariations[creator] = (creatorVariations[creator] || 0) + 1;
    }
  });
  
  console.log('Creator name variations found:');
  Object.entries(creatorVariations).forEach(([name, count]) => {
    console.log(`  "${name}": ${count} records`);
  });
  
} catch (error) {
  console.error('Error reading file:', error);
}