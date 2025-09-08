const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateAnnekoiiCommission() {
  console.log('Updating @annekoii commission to $121.79...\n');

  try {
    // Find the most recent @annekoii record
    const { data: records, error: fetchError } = await supabase
      .from('contents')
      .select('*')
      .ilike('creator_name', '%annekoii%')
      .order('publish_date', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching data:', fetchError);
      return;
    }

    if (!records || records.length === 0) {
      console.log('No @annekoii records found');
      return;
    }

    const record = records[0];
    console.log('Found record to update:');
    console.log('  ID:', record.id);
    console.log('  Creator:', record.creator_name);
    console.log('  Content:', record.content_title?.substring(0, 50) + '...');
    console.log('  Current commission:', record.est_commission);
    console.log('  Publish date:', record.publish_date);

    // Update the commission to $121.79
    const { data: updateData, error: updateError } = await supabase
      .from('contents')
      .update({ 
        est_commission: 121.79,
        updated_at: new Date().toISOString()
      })
      .eq('id', record.id)
      .select();

    if (updateError) {
      console.error('Error updating record:', updateError);
      return;
    }

    console.log('\n✅ Successfully updated commission to $121.79');
    console.log('Updated record:', updateData[0]);

    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('contents')
      .select('est_commission')
      .eq('id', record.id)
      .single();

    if (!verifyError && verifyData) {
      console.log('\nVerification: Commission is now $' + verifyData.est_commission);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

updateAnnekoiiCommission();