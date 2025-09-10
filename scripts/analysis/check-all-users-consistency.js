const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkAllUsersConsistency() {
  console.log('Checking data consistency for all users...\n');
  console.log('Date:', new Date().toISOString());
  console.log('=====================================\n');

  try {
    // 1. Read Excel file data
    const dataDir = path.join(__dirname, '..', 'data');
    const files = fs.readdirSync(dataDir);
    const videoListFile = files.find(f => f.startsWith('Video_List') && (f.endsWith('.xlsx') || f.endsWith('.csv')));
    
    if (!videoListFile) {
      console.log('Video_List file not found');
      return;
    }
    
    const filePath = path.join(dataDir, videoListFile);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const excelData = XLSX.utils.sheet_to_json(worksheet);
    
    // Group Excel data by creator
    const excelByCreator = {};
    excelData.forEach(row => {
      const creator = row['Creator username'];
      if (!creator) return;
      
      if (!excelByCreator[creator]) {
        excelByCreator[creator] = {
          records: 0,
          totalLikes: 0,
          totalComments: 0,
          totalGMV: 0,
          totalCommission: 0
        };
      }
      
      excelByCreator[creator].records++;
      excelByCreator[creator].totalLikes += Number(row['Shoppable video likes']) || 0;
      excelByCreator[creator].totalComments += Number(row['Shoppable video comments']) || 0;
      excelByCreator[creator].totalGMV += Number(row['GMV']) || 0;
      excelByCreator[creator].totalCommission += Number(row['Est. commission']) || 0;
    });
    
    // 2. Get database data
    const { data: dbData, error } = await supabase
      .from('contents')
      .select('*');
    
    if (error) {
      console.error('Error fetching database data:', error);
      return;
    }
    
    // Group database data by creator
    const dbByCreator = {};
    dbData.forEach(row => {
      const creator = row.creator_name;
      if (!creator) return;
      
      if (!dbByCreator[creator]) {
        dbByCreator[creator] = {
          records: 0,
          totalLikes: 0,
          totalComments: 0,
          totalGMV: 0,
          totalCommission: 0
        };
      }
      
      dbByCreator[creator].records++;
      dbByCreator[creator].totalLikes += Number(row.like_count) || 0;
      dbByCreator[creator].totalComments += Number(row.comment_count) || 0;
      dbByCreator[creator].totalGMV += Number(row.gmv) || 0;
      dbByCreator[creator].totalCommission += Number(row.est_commission) || 0;
    });
    
    // 3. Compare top creators
    console.log('=== TOP CREATORS WITH DISCREPANCIES ===\n');
    
    const discrepancies = [];
    
    // Check creators that exist in Excel
    Object.keys(excelByCreator).forEach(creator => {
      const excel = excelByCreator[creator];
      const db = dbByCreator[creator] || { records: 0, totalLikes: 0, totalComments: 0, totalGMV: 0, totalCommission: 0 };
      
      const likesDiff = Math.abs(excel.totalLikes - db.totalLikes);
      const commentsDiff = Math.abs(excel.totalComments - db.totalComments);
      const gmvDiff = Math.abs(excel.totalGMV - db.totalGMV);
      const commissionDiff = Math.abs(excel.totalCommission - db.totalCommission);
      
      if (likesDiff > 10 || commentsDiff > 5 || gmvDiff > 100 || commissionDiff > 10) {
        discrepancies.push({
          creator,
          excel,
          db,
          differences: {
            likes: excel.totalLikes - db.totalLikes,
            comments: excel.totalComments - db.totalComments,
            gmv: excel.totalGMV - db.totalGMV,
            commission: excel.totalCommission - db.totalCommission,
            records: excel.records - db.records
          }
        });
      }
    });
    
    // Sort by GMV difference
    discrepancies.sort((a, b) => Math.abs(b.differences.gmv) - Math.abs(a.differences.gmv));
    
    // Show top 10 discrepancies
    console.log(`Found ${discrepancies.length} creators with significant discrepancies\n`);
    
    discrepancies.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.creator}`);
      console.log('   Excel Data:');
      console.log(`     Records: ${item.excel.records}`);
      console.log(`     Likes: ${item.excel.totalLikes}, Comments: ${item.excel.totalComments}`);
      console.log(`     GMV: $${item.excel.totalGMV.toFixed(2)}, Commission: $${item.excel.totalCommission.toFixed(2)}`);
      console.log('   Database Data:');
      console.log(`     Records: ${item.db.records}`);
      console.log(`     Likes: ${item.db.totalLikes}, Comments: ${item.db.totalComments}`);
      console.log(`     GMV: $${item.db.totalGMV.toFixed(2)}, Commission: $${item.db.totalCommission.toFixed(2)}`);
      console.log('   Differences:');
      console.log(`     Records: ${item.differences.records > 0 ? '+' : ''}${item.differences.records}`);
      console.log(`     Likes: ${item.differences.likes > 0 ? '+' : ''}${item.differences.likes}`);
      console.log(`     Comments: ${item.differences.comments > 0 ? '+' : ''}${item.differences.comments}`);
      console.log(`     GMV: ${item.differences.gmv > 0 ? '+' : ''}$${item.differences.gmv.toFixed(2)}`);
      console.log(`     Commission: ${item.differences.commission > 0 ? '+' : ''}$${item.differences.commission.toFixed(2)}`);
      console.log('');
    });
    
    // Summary statistics
    console.log('=== SUMMARY ===\n');
    console.log(`Total creators in Excel: ${Object.keys(excelByCreator).length}`);
    console.log(`Total creators in Database: ${Object.keys(dbByCreator).length}`);
    console.log(`Creators with discrepancies: ${discrepancies.length}`);
    
    // Calculate total differences
    let totalLikesDiff = 0;
    let totalCommentsDiff = 0;
    let totalGmvDiff = 0;
    let totalCommissionDiff = 0;
    
    discrepancies.forEach(item => {
      totalLikesDiff += item.differences.likes;
      totalCommentsDiff += item.differences.comments;
      totalGmvDiff += item.differences.gmv;
      totalCommissionDiff += item.differences.commission;
    });
    
    console.log('\nTotal differences across all creators:');
    console.log(`  Likes: ${totalLikesDiff > 0 ? '+' : ''}${totalLikesDiff}`);
    console.log(`  Comments: ${totalCommentsDiff > 0 ? '+' : ''}${totalCommentsDiff}`);
    console.log(`  GMV: ${totalGmvDiff > 0 ? '+' : ''}$${totalGmvDiff.toFixed(2)}`);
    console.log(`  Commission: ${totalCommissionDiff > 0 ? '+' : ''}$${totalCommissionDiff.toFixed(2)}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAllUsersConsistency();