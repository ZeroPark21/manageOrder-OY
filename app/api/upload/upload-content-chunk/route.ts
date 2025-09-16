import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { contents, isLastChunk } = await request.json()
    
    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const supabase = createServerClient()
    console.log(`청크 처리 시작: ${contents.length}개 항목`)
    
    try {
      // 배치 삽입으로 성능 개선 (onConflict 제거)
      const { data: result, error: insertError } = await supabase
        .from("contents")
        .insert(contents)
        .select('id')

      if (insertError) {
        console.error("배치 삽입 오류:", insertError)
        return NextResponse.json({ 
          error: "데이터 저장 중 오류가 발생했습니다.",
          details: insertError.message 
        }, { status: 500 })
      }

      const saved = result ? result.length : contents.length
      console.log(`청크 처리 완료: ${saved}개 저장됨`)
      
      return NextResponse.json({
        saved,
        isLastChunk
      })
      
    } catch (dbError) {
      console.error("데이터베이스 처리 중 오류:", dbError)
      return NextResponse.json({ 
        error: "데이터베이스 처리 중 오류가 발생했습니다.",
        details: dbError instanceof Error ? dbError.message : "Unknown error"
      }, { status: 500 })
    }
  } catch (err: any) {
    console.error("청크 업로드 오류:", err)
    console.error("오류 타입:", typeof err)
    console.error("오류 스택:", err?.stack || 'No stack trace')
    console.error("전체 오류 객체:", JSON.stringify(err, null, 2))
    
    const errorMessage = err?.message || 
                        (typeof err === 'string' ? err : '') ||
                        "Internal server error"
    
    return NextResponse.json({ 
      error: errorMessage,
      details: JSON.stringify(err),
      type: err?.name || "UnknownError"
    }, { status: 500 })
  }
}