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
    
    let saved = 0
    
    // 개별 처리로 중복 문제 해결 (안전한 방식)
    for (const content of contents) {
      try {
        // 먼저 기존 데이터 확인
        const { data: existing } = await supabase
          .from("contents")
          .select("id")
          .eq("video_link", content.video_link)
          .single()

        if (existing) {
          // 기존 데이터 업데이트
          const { error: updateError } = await supabase
            .from("contents")
            .update(content)
            .eq("id", existing.id)
          
          if (!updateError) saved++
        } else {
          // 새 데이터 삽입
          const { error: insertError } = await supabase
            .from("contents")
            .insert(content)
          
          if (!insertError) saved++
        }
      } catch (itemError) {
        console.log(`항목 처리 중 오류 (${content.video_link}):`, itemError)
        // 개별 오류는 무시하고 계속 진행
      }
    }

    console.log(`청크 처리 완료: ${saved}개 저장됨`)
    
    return NextResponse.json({
      saved,
      isLastChunk
    })
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