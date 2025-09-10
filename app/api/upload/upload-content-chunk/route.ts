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
        const { data: existing } = await supabase
          .from("contents")
          .select("id")
          .eq("video_link", content.video_link)
          .single()

        if (existing) {
          // 업데이트
          await supabase
            .from("contents")
            .update(content)
            .eq("id", existing.id)
        } else {
          // 삽입
          await supabase
            .from("contents")
            .insert(content)
        }
        
        saved++
      } catch (e) {
        // 개별 오류는 무시
      }
    }

    return NextResponse.json({
      saved,
      isLastChunk
    })
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.message || "Internal server error"
    }, { status: 500 })
  }
}