import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // GMV가 0이 아닌 데이터 확인
    const { data: nonZeroGmv, error: error1 } = await supabase
      .from("contents")
      .select("content_title, gmv, video_link")
      .gt("gmv", 0)
      .limit(10)
    
    // 전체 GMV 합계
    const { data: allContents, error: error2 } = await supabase
      .from("contents")
      .select("gmv")
    
    const totalGmv = allContents?.reduce((sum, item) => sum + (item.gmv || 0), 0) || 0
    const nonZeroCount = allContents?.filter(item => item.gmv > 0).length || 0
    
    return NextResponse.json({
      totalContents: allContents?.length || 0,
      nonZeroGmvCount: nonZeroCount,
      totalGmv: totalGmv,
      sampleNonZeroGmv: nonZeroGmv || [],
      message: nonZeroCount === 0 ? "⚠️ 모든 GMV 값이 0입니다! CSV 파일을 다시 업로드해야 합니다." : "GMV 데이터가 정상입니다."
    })
  } catch (error) {
    return NextResponse.json({ error: error }, { status: 500 })
  }
}