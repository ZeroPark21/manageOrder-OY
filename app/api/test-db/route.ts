import { NextResponse } from "next/server"
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    console.log("Testing Supabase connection...")
    console.log("URL:", supabaseUrl)

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Test 1: Check if amazon_orders table exists
    const { data: tables, error: tablesError } = await supabase
      .from('amazon_orders')
      .select('*')
      .limit(1)

    if (tablesError) {
      console.error("Table check error:", tablesError)

      // If table doesn't exist, return the SQL to create it
      if (tablesError.message.includes('relation') || tablesError.message.includes('does not exist')) {
        return NextResponse.json({
          error: "Table 'amazon_orders' does not exist",
          message: "Please run the following SQL in Supabase Dashboard:",
          sql: `
-- Create amazon_orders table
CREATE TABLE IF NOT EXISTS amazon_orders (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL,
  order_id VARCHAR(50),
  order_item_id VARCHAR(50),
  purchase_date DATE,
  payments_date DATE,
  ship_date DATE,
  buyer_email VARCHAR(255),
  buyer_name VARCHAR(255),
  buyer_phone_number VARCHAR(50),
  recipient_name VARCHAR(255),
  ship_address_1 TEXT,
  ship_address_2 TEXT,
  ship_address_3 TEXT,
  ship_city VARCHAR(100),
  ship_state VARCHAR(50),
  ship_postal_code VARCHAR(20),
  ship_country VARCHAR(50),
  sku VARCHAR(100),
  product_name TEXT,
  asin VARCHAR(20),
  quantity_purchased INTEGER DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  item_price DECIMAL(12, 2),
  item_tax DECIMAL(10, 2),
  shipping_price DECIMAL(10, 2),
  shipping_tax DECIMAL(10, 2),
  gift_wrap_price DECIMAL(10, 2),
  gift_wrap_tax DECIMAL(10, 2),
  item_promotion_discount DECIMAL(10, 2),
  ship_promotion_discount DECIMAL(10, 2),
  ship_service_level VARCHAR(50),
  item_status VARCHAR(50),
  fulfillment_channel VARCHAR(20),
  sales_channel VARCHAR(50),
  order_channel VARCHAR(50),
  is_business_order BOOLEAN DEFAULT false,
  is_prime BOOLEAN DEFAULT false,
  is_premium_order BOOLEAN DEFAULT false,
  price_designation VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, order_item_id)
);

-- Create index
CREATE INDEX idx_amazon_orders_company_date ON amazon_orders(company_id, purchase_date DESC);
`
        }, { status: 200 })
      }

      return NextResponse.json({ error: tablesError.message }, { status: 500 })
    }

    // Test 2: Check companies table
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5)

    if (companiesError) {
      console.error("Companies check error:", companiesError)
      return NextResponse.json({
        error: "Companies table error",
        details: companiesError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      amazon_orders_table: "exists",
      companies: companies,
      test_data: tables
    })
  } catch (error) {
    console.error("Test DB error:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}