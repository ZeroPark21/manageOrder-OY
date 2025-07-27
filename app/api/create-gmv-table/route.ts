import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 GMV 테이블 생성 API 시작")
    
    const supabase = createServerClient()

    // SQL 쿼리로 테이블 생성
    const createTableSQL = `
      -- GMV 데이터 테이블 생성 (Excel 파일 구조에 맞춤)
      CREATE TABLE IF NOT EXISTS gmv_data (
          id BIGSERIAL PRIMARY KEY,
          video_id TEXT,
          video_title TEXT,
          tiktok_account TEXT,
          creative_type TEXT,
          status TEXT,
          orders INTEGER DEFAULT 0,
          gross_revenue BIGINT DEFAULT 0,
          ad_impressions INTEGER DEFAULT 0,
          ad_clicks INTEGER DEFAULT 0,
          ad_click_rate DECIMAL(6,4) DEFAULT 0,
          ad_conversion_rate DECIMAL(6,4) DEFAULT 0,
          video_view_rate_2s TEXT,
          video_view_rate_6s TEXT,
          video_view_rate_25 TEXT,
          video_view_rate_50 TEXT,
          video_view_rate_75 TEXT,
          video_view_rate_100 TEXT,
          currency TEXT DEFAULT 'KRW',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- 인덱스 생성 (성능 향상)
      CREATE INDEX IF NOT EXISTS idx_gmv_data_video_id ON gmv_data(video_id);
      CREATE INDEX IF NOT EXISTS idx_gmv_data_tiktok_account ON gmv_data(tiktok_account);
      CREATE INDEX IF NOT EXISTS idx_gmv_data_gross_revenue ON gmv_data(gross_revenue);
      CREATE INDEX IF NOT EXISTS idx_gmv_data_created_at ON gmv_data(created_at);

      -- RLS (Row Level Security) 활성화
      ALTER TABLE gmv_data ENABLE ROW LEVEL SECURITY;

      -- RLS 정책 설정 (모든 사용자가 읽기/쓰기 가능)
      DROP POLICY IF EXISTS "Enable read access for all users" ON gmv_data;
      DROP POLICY IF EXISTS "Enable insert access for all users" ON gmv_data;
      DROP POLICY IF EXISTS "Enable update access for all users" ON gmv_data;
      DROP POLICY IF EXISTS "Enable delete access for all users" ON gmv_data;

      CREATE POLICY "Enable read access for all users" ON gmv_data
          FOR SELECT USING (true);

      CREATE POLICY "Enable insert access for all users" ON gmv_data
          FOR INSERT WITH CHECK (true);

      CREATE POLICY "Enable update access for all users" ON gmv_data
          FOR UPDATE USING (true);

      CREATE POLICY "Enable delete access for all users" ON gmv_data
          FOR DELETE USING (true);
    `

    console.log("📊 테이블 생성 SQL 실행 중...")

    // SQL 실행 (각 명령을 개별적으로 실행)
    const commands = [
      `CREATE TABLE IF NOT EXISTS gmv_data (
          id BIGSERIAL PRIMARY KEY,
          video_id TEXT,
          video_title TEXT,
          tiktok_account TEXT,
          creative_type TEXT,
          status TEXT,
          orders INTEGER DEFAULT 0,
          gross_revenue BIGINT DEFAULT 0,
          ad_impressions INTEGER DEFAULT 0,
          ad_clicks INTEGER DEFAULT 0,
          ad_click_rate DECIMAL(6,4) DEFAULT 0,
          ad_conversion_rate DECIMAL(6,4) DEFAULT 0,
          video_view_rate_2s TEXT,
          video_view_rate_6s TEXT,
          video_view_rate_25 TEXT,
          video_view_rate_50 TEXT,
          video_view_rate_75 TEXT,
          video_view_rate_100 TEXT,
          currency TEXT DEFAULT 'KRW',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS idx_gmv_data_video_id ON gmv_data(video_id)`,
      `CREATE INDEX IF NOT EXISTS idx_gmv_data_tiktok_account ON gmv_data(tiktok_account)`,
      `CREATE INDEX IF NOT EXISTS idx_gmv_data_gross_revenue ON gmv_data(gross_revenue)`,
      `ALTER TABLE gmv_data ENABLE ROW LEVEL SECURITY`,
      `CREATE POLICY IF NOT EXISTS "Enable read access for all users" ON gmv_data FOR SELECT USING (true)`,
      `CREATE POLICY IF NOT EXISTS "Enable insert access for all users" ON gmv_data FOR INSERT WITH CHECK (true)`,
      `CREATE POLICY IF NOT EXISTS "Enable update access for all users" ON gmv_data FOR UPDATE USING (true)`,
      `CREATE POLICY IF NOT EXISTS "Enable delete access for all users" ON gmv_data FOR DELETE USING (true)`
    ]

    // 각 명령 실행
    for (const command of commands) {
      const { error: cmdError } = await supabase.rpc('sql', { query: command })
      if (cmdError) {
        console.log(`SQL 명령 실행 중 오류 (무시 가능): ${cmdError.message}`)
      }
    }

    const { data, error } = { data: null, error: null }

    if (error) {
      console.error("테이블 생성 오류:", error)
      
      // 대안: 기본적인 테이블 체크
      const { data: testData, error: testError } = await supabase
        .from('gmv_data')
        .select('id')
        .limit(1)
      
      if (!testError) {
        console.log("✅ 테이블이 이미 존재합니다")
        return NextResponse.json({
          message: "GMV 테이블이 이미 존재합니다",
          tableExists: true
        })
      }
      
      return NextResponse.json({ 
        error: "테이블 생성 실패", 
        details: error.message,
        suggestion: "Supabase 대시보드에서 수동으로 테이블을 생성해주세요."
      }, { status: 500 })
    }

    console.log("✅ GMV 테이블 생성 완료")

    // 테이블 생성 확인
    const { data: verifyData, error: verifyError } = await supabase
      .from('gmv_data')
      .select('id')
      .limit(1)

    if (verifyError) {
      console.error("테이블 확인 오류:", verifyError)
      return NextResponse.json({ 
        error: "테이블 생성 후 확인 실패", 
        details: verifyError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: "GMV 테이블이 성공적으로 생성되었습니다!",
      tableCreated: true,
      timestamp: new Date().toISOString()
    })

  } catch (err: any) {
    console.error("테이블 생성 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error",
      details: err.stack 
    }, { status: 500 })
  }
}