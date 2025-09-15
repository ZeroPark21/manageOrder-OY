import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    const { contents, isLastChunk } = await request.json()
    
    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    const supabase = createServerClient()
    let saved = 0

    // 각 항목을 개별적으로 upsert
    for (const content of contents) {
      try {
        // 먼저 존재 여부 확인
        const { data: existing, error: selectError } = await supabase
          .from("contents")
          .select("id")
          .eq("video_link", content.video_link)
          .single()

        if (selectError && selectError.code !== 'PGRST116') {
          // PGRST116는 "row not found" 오류로 정상적인 경우
          console.error(`청크 처리 중 조회 오류 (${content.video_link}):`, selectError)
          continue
        }

        if (existing) {
          // 업데이트
          const { error: updateError } = await supabase
            .from("contents")
            .update(content)
            .eq("id", existing.id)
          
          if (updateError) {
            console.error(`청크 처리 중 업데이트 오류 (${content.video_link}):`, updateError)
            continue
          }
        } else {
          // 삽입
          const { error: insertError } = await supabase
            .from("contents")
            .insert(content)
          
          if (insertError) {
            console.error(`청크 처리 중 삽입 오류 (${content.video_link}):`, insertError)
            continue
          }
        }
        
        saved++
      } catch (e) {
        console.error(`청크 처리 중 예외 발생 (${content.video_link}):`, e)
        // 개별 오류는 무시하되 로그는 남김
      }
    }

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