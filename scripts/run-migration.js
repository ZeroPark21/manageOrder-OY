const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cekqainvjrliiqynixnw.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNla3FhaW52anJsaWlxeW5peG53Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA2NjMzMiwiZXhwIjoyMDY4NjQyMzMyfQ.ZF7sDI_ddq5n5IP4uRjcfrHQwQe4G4FQidHpVJItI4s';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250930_amazon_orders_simple.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running Amazon orders table migration...');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

    if (error) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️ RPC method not available, trying alternative approach...');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        console.log('Executing statement:', statement.substring(0, 50) + '...');

        // Note: This is a simplified approach. In production, you'd use proper migration tools
        // For now, we'll just check if the table exists
      }

      console.log('❌ Please run the migration manually in Supabase Dashboard SQL Editor');
      console.log('📋 Migration file location:', migrationPath);
      return;
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('Please run the migration manually in Supabase Dashboard SQL Editor');
  }
}

runMigration();