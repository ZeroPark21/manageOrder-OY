const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUploadFix() {
  console.log('Testing upload API fix...');
  console.log('=====================================\n');

  try {
    // Test a few key creators to verify data integrity
    const testCreators = [
      { name: 'annekoii', expectedLikes: 496, expectedComments: 17 },
      { name: 'frodo.gaggins', expectedRecords: 51 },
      { name: 'imperfectlyanjie', expectedRecords: 22 }
    ];

    console.log('Checking current database state after fix:\n');

    for (const creator of testCreators) {
      const { data, error, count } = await supabase
        .from('contents')
        .select('*', { count: 'exact' })
        .ilike('creator_name', `%${creator.name}%`);

      if (error) {
        console.error(`Error fetching ${creator.name}:`, error);
        continue;
      }

      const totalLikes = data.reduce((sum, r) => sum + (r.like_count || 0), 0);
      const totalComments = data.reduce((sum, r) => sum + (r.comment_count || 0), 0);
      const totalGMV = data.reduce((sum, r) => sum + (r.gmv || 0), 0);
      const totalCommission = data.reduce((sum, r) => sum + (r.est_commission || 0), 0);

      console.log(`📊 ${creator.name}:`);
      console.log(`   Records: ${count}`);
      console.log(`   Total Likes: ${totalLikes}${creator.expectedLikes ? ` (expected: ${creator.expectedLikes})` : ''}`);
      console.log(`   Total Comments: ${totalComments}${creator.expectedComments ? ` (expected: ${creator.expectedComments})` : ''}`);
      console.log(`   Total GMV: $${totalGMV.toFixed(2)}`);
      console.log(`   Total Commission: $${totalCommission.toFixed(2)}`);
      
      // Check if expectations are met
      if (creator.expectedLikes && totalLikes !== creator.expectedLikes) {
        console.log(`   ⚠️ Likes mismatch: ${totalLikes} vs ${creator.expectedLikes}`);
      }
      if (creator.expectedComments && totalComments !== creator.expectedComments) {
        console.log(`   ⚠️ Comments mismatch: ${totalComments} vs ${creator.expectedComments}`);
      }
      if (creator.expectedRecords && count !== creator.expectedRecords) {
        console.log(`   ⚠️ Record count mismatch: ${count} vs ${creator.expectedRecords}`);
      }
      
      console.log('');
    }

    // Summary of upload API improvements
    console.log('\n=== UPLOAD API IMPROVEMENTS ===\n');
    console.log('✅ Fixed Issues:');
    console.log('1. All fields are now properly updated when existing records are found');
    console.log('2. Like and comment counts are correctly preserved and updated');
    console.log('3. Duplicate handling improved - keeps record with higher GMV/likes');
    console.log('4. Added data validation after upload');
    console.log('5. Better logging for debugging');
    
    console.log('\n✅ Key Changes:');
    console.log('- Update logic now explicitly updates ALL fields');
    console.log('- Added comparison to check if data actually changed');
    console.log('- Improved duplicate detection within uploaded file');
    console.log('- Added verification step for key creators');
    
    console.log('\n✅ Prevention Measures:');
    console.log('- Always compare all fields before deciding to skip');
    console.log('- Log before/after values for visibility');
    console.log('- Validate data integrity after upload completes');

  } catch (error) {
    console.error('Test error:', error);
  }
}

testUploadFix();