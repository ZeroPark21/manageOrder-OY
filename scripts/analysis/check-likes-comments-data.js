const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkLikesCommentsData() {
  console.log('Checking likes and comments data discrepancy...\n');

  try {
    // 1. Check Excel file data
    console.log('=== EXCEL FILE DATA ===\n');
    const dataDir = path.join(__dirname, '..', 'data');
    const files = fs.readdirSync(dataDir);
    const videoListFile = files.find(f => f.startsWith('Video_List') && (f.endsWith('.xlsx') || f.endsWith('.csv')));
    
    if (videoListFile) {
      const filePath = path.join(dataDir, videoListFile);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const excelData = XLSX.utils.sheet_to_json(worksheet);
      
      // Check column names
      if (excelData.length > 0) {
        console.log('Excel column names:');
        const columns = Object.keys(excelData[0]);
        const likeColumns = columns.filter(col => col.toLowerCase().includes('like'));
        const commentColumns = columns.filter(col => col.toLowerCase().includes('comment'));
        
        console.log('Like-related columns:', likeColumns);
        console.log('Comment-related columns:', commentColumns);
        
        // Check annekoii data in Excel
        const annekoiiExcel = excelData.filter(row => {
          const creator = row['Creator username'] || '';
          return creator.toLowerCase().includes('annekoii');
        });
        
        console.log(`\nFound ${annekoiiExcel.length} @annekoii records in Excel`);
        
        if (annekoiiExcel.length > 0) {
          let totalExcelLikes = 0;
          let totalExcelComments = 0;
          
          console.log('\nFirst 5 @annekoii Excel records:');
          annekoiiExcel.slice(0, 5).forEach((row, i) => {
            const likes = row['Shoppable video likes'] || row['shoppable_video_likes'] || 0;
            const comments = row['Shoppable video comments'] || row['shoppable_video_comments'] || 0;
            
            console.log(`${i + 1}. Video: ${row['Video name']?.substring(0, 30)}...`);
            console.log(`   Likes: ${likes}, Comments: ${comments}`);
            
            totalExcelLikes += Number(likes) || 0;
            totalExcelComments += Number(comments) || 0;
          });
          
          // Calculate total for all records
          annekoiiExcel.forEach(row => {
            totalExcelLikes += Number(row['Shoppable video likes'] || 0);
            totalExcelComments += Number(row['Shoppable video comments'] || 0);
          });
          
          console.log(`\nExcel Total for @annekoii:`);
          console.log(`Total Likes: ${totalExcelLikes}`);
          console.log(`Total Comments: ${totalExcelComments}`);
        }
      }
    }
    
    // 2. Check Database data
    console.log('\n=== DATABASE DATA ===\n');
    
    const { data: dbData, error } = await supabase
      .from('contents')
      .select('*')
      .ilike('creator_name', '%annekoii%')
      .order('publish_date', { ascending: false });
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log(`Found ${dbData.length} @annekoii records in database`);
    
    let totalDbLikes = 0;
    let totalDbComments = 0;
    
    console.log('\nFirst 5 database records:');
    dbData.slice(0, 5).forEach((row, i) => {
      console.log(`${i + 1}. Video: ${row.content_title?.substring(0, 30)}...`);
      console.log(`   Likes: ${row.like_count}, Comments: ${row.comment_count}`);
      console.log(`   Raw data - like_count: ${row.like_count}, comment_count: ${row.comment_count}`);
      
      totalDbLikes += Number(row.like_count) || 0;
      totalDbComments += Number(row.comment_count) || 0;
    });
    
    // Calculate total for all records
    dbData.forEach(row => {
      totalDbLikes += Number(row.like_count) || 0;
      totalDbComments += Number(row.comment_count) || 0;
    });
    
    console.log(`\nDatabase Total for @annekoii:`);
    console.log(`Total Likes: ${totalDbLikes}`);
    console.log(`Total Comments: ${totalDbComments}`);
    
    // 3. Check API response
    console.log('\n=== API RESPONSE ===\n');
    
    const apiResponse = await fetch('http://localhost:3000/api/contents?groupBy=creator', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      const annekoiiApi = apiData.data?.find(creator => creator.creator === 'annekoii');
      
      if (annekoiiApi) {
        console.log('API response for @annekoii:');
        console.log(`Total videos: ${annekoiiApi.totalCount}`);
        
        let apiTotalLikes = 0;
        let apiTotalComments = 0;
        
        if (annekoiiApi.contents) {
          annekoiiApi.contents.forEach(content => {
            apiTotalLikes += Number(content.like_count) || 0;
            apiTotalComments += Number(content.comment_count) || 0;
          });
        }
        
        console.log(`Total Likes from API: ${apiTotalLikes}`);
        console.log(`Total Comments from API: ${apiTotalComments}`);
      }
    } else {
      console.log('Could not fetch API data (server may not be running)');
    }
    
    // 4. Summary
    console.log('\n=== SUMMARY ===\n');
    console.log('If there are discrepancies, check:');
    console.log('1. Column mapping in upload API (like_count vs Shoppable video likes)');
    console.log('2. Data type conversion (string to number)');
    console.log('3. Null/undefined handling');
    console.log('4. Aggregation logic in frontend');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkLikesCommentsData();