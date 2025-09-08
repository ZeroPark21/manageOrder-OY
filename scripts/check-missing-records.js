const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkMissingRecords() {
  console.log('Checking missing records between Excel and Database...\n');

  try {
    // Get Excel video links
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
    
    // Get annekoii data from Excel
    const annekoiiExcel = excelData.filter(row => {
      const creator = row['Creator username'] || '';
      return creator.toLowerCase().includes('annekoii');
    });
    
    const excelVideoLinks = new Set(annekoiiExcel.map(row => row['Video link']));
    console.log(`Excel has ${excelVideoLinks.size} @annekoii video links`);
    
    // Get database records
    const { data: dbData, error } = await supabase
      .from('contents')
      .select('*')
      .ilike('creator_name', '%annekoii%')
      .order('publish_date', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log(`Database has ${dbData.length} @annekoii records`);
    
    // Find records in DB but not in Excel
    console.log('\n=== Records in DATABASE but not in EXCEL ===\n');
    let extraInDb = 0;
    dbData.forEach(record => {
      if (!excelVideoLinks.has(record.video_link)) {
        extraInDb++;
        console.log(`${extraInDb}. ${record.content_title?.substring(0, 50)}...`);
        console.log(`   Video link: ${record.video_link}`);
        console.log(`   Publish date: ${record.publish_date}`);
        console.log(`   Likes: ${record.like_count}, Comments: ${record.comment_count}`);
        console.log(`   GMV: ${record.gmv}, Commission: ${record.est_commission}`);
        console.log('');
      }
    });
    
    if (extraInDb === 0) {
      console.log('No extra records in database');
    }
    
    // Find records in Excel but not in DB
    console.log('\n=== Records in EXCEL but not in DATABASE ===\n');
    const dbVideoLinks = new Set(dbData.map(row => row.video_link));
    let extraInExcel = 0;
    
    annekoiiExcel.forEach(row => {
      if (!dbVideoLinks.has(row['Video link'])) {
        extraInExcel++;
        console.log(`${extraInExcel}. ${row['Video name']?.substring(0, 50)}...`);
        console.log(`   Video link: ${row['Video link']}`);
        console.log(`   Publish date: ${row['Video post date']}`);
        console.log('');
      }
    });
    
    if (extraInExcel === 0) {
      console.log('No extra records in Excel');
    }
    
    // Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total in Excel: ${annekoiiExcel.length}`);
    console.log(`Total in Database: ${dbData.length}`);
    console.log(`Extra in Database: ${extraInDb}`);
    console.log(`Extra in Excel: ${extraInExcel}`);
    
    // Calculate total likes and comments for matching records only
    let matchingLikes = 0;
    let matchingComments = 0;
    
    dbData.forEach(record => {
      if (excelVideoLinks.has(record.video_link)) {
        matchingLikes += Number(record.like_count) || 0;
        matchingComments += Number(record.comment_count) || 0;
      }
    });
    
    console.log(`\nTotal likes for matching records: ${matchingLikes}`);
    console.log(`Total comments for matching records: ${matchingComments}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkMissingRecords();