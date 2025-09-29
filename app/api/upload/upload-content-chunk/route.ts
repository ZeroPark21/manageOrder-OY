import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/database/supabase"

export const runtime = "nodejs"
export const maxDuration = 10 // 10초로 대폭 감소

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

    let saved = 0

    // 최대 10개만 처리 (타임아웃 방지)
    const itemsToProcess = contents.slice(0, 10)

    // 빠른 개별 처리 (병렬)
    const promises = itemsToProcess.map(async (content) => {
      const contentWithCompany = { ...content, company_id: companyId }

      try {
        // 먼저 삽입 시도
        const { error: insertError } = await supabase
          .from("contents")
          .insert(contentWithCompany)

        if (!insertError) {
          return 1
        }

        // 중복이면 업데이트
        if (insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
          const { data: existing } = await supabase
            .from("contents")
            .select("id")
            .eq("video_link", content.video_link)
            .eq("company_id", companyId)
            .single()

          if (existing) {
            const { error: updateError } = await supabase
              .from("contents")
              .update(contentWithCompany)
              .eq("id", existing.id)

            return updateError ? 0 : 1
          }
        }

        return 0
      } catch (e) {
        return 0
      }
    })

    const results = await Promise.all(promises)
    saved = results.reduce((sum: number, val: number) => sum + val, 0)

    return NextResponse.json({
      saved,
      isLastChunk,
      processed: itemsToProcess.length
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