const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function reuploadAnnekoiiData() {
  console.log('Re-uploading @annekoii data with correct likes and comments...\n');

  try {
    // Read Excel file
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
    
    // Filter annekoii data
    const annekoiiData = excelData.filter(row => {
      const creator = row['Creator username'] || '';
      return creator.toLowerCase().includes('annekoii');
    });
    
    console.log(`Found ${annekoiiData.length} @annekoii records to update`);
    
    // Update each record in database
    let updatedCount = 0;
    let errors = [];
    
    for (const row of annekoiiData) {
      const videoLink = row['Video link'];
      const likes = Number(row['Shoppable video likes']) || 0;
      const comments = Number(row['Shoppable video comments']) || 0;
      
      if (!videoLink) continue;
      
      // Update in database
      const { data, error } = await supabase
        .from('contents')
        .update({
          like_count: likes,
          comment_count: comments,
          updated_at: new Date().toISOString()
        })
        .eq('video_link', videoLink)
        .select();
      
      if (error) {
        errors.push(`Error updating ${videoLink}: ${error.message}`);
      } else if (data && data.length > 0) {
        updatedCount++;
        console.log(`Updated: ${row['Video name']?.substring(0, 30)}...`);
        console.log(`  Likes: ${likes}, Comments: ${comments}`);
      }
    }
    
    console.log(`\n✅ Successfully updated ${updatedCount} records`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(err));
    }
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('contents')
      .select('like_count, comment_count')
      .ilike('creator_name', '%annekoii%');
    
    if (!verifyError && verifyData) {
      let totalLikes = 0;
      let totalComments = 0;
      
      verifyData.forEach(row => {
        totalLikes += Number(row.like_count) || 0;
        totalComments += Number(row.comment_count) || 0;
      });
      
      console.log('\n=== VERIFICATION ===');
      console.log(`Total Likes in DB: ${totalLikes}`);
      console.log(`Total Comments in DB: ${totalComments}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

reuploadAnnekoiiData();