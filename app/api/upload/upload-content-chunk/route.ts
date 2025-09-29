import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const { contents, isLastChunk, companyId } = await request.json()

    if (!contents || !Array.isArray(contents)) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 })
    }

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })
    }

    const supabase = createServerClient()
    console.log(`청크 처리 시작: ${contents.length}개 항목, companyId: ${companyId}`)

    // 병렬 처리로 속도 향상
    const promises = contents.map(async (content, index) => {
      try {
        // companyId 추가
        const contentWithCompany = { ...content, company_id: companyId }

        // 첫 번째 항목 로그로 확인
        if (index === 0) {
          console.log(`첫 번째 항목 처리:`, {
            video_link: content.video_link,
            company_id: companyId,
            content_title: content.content_title
          })
        }

        // 먼저 기존 데이터 확인
        const { data: existing } = await supabase
          .from("contents")
          .select("id")
          .eq("video_link", content.video_link)
          .eq("company_id", companyId)
          .single()

        if (existing) {
          // 기존 데이터 업데이트
          const { error: updateError } = await supabase
            .from("contents")
            .update(contentWithCompany)
            .eq("id", existing.id)

          return updateError ? 0 : 1
        } else {
          // 새 데이터 삽입
          const { error: insertError } = await supabase
            .from("contents")
            .insert(contentWithCompany)

          if (insertError) {
            console.error(`삽입 실패 (companyId: ${companyId}):`, {
              error: insertError.message,
              video_link: content.video_link,
              company_id: companyId
            })
            return 0
          }
          return 1
        }
      } catch (itemError) {
        console.error(`처리 중 예외 발생:`, itemError)
        return 0
      }
    })

    const results = await Promise.all(promises)
    const saved = results.reduce((sum: number, val: number) => sum + val, 0)

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