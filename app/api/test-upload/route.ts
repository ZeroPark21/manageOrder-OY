import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 테스트 업로드 API 시작")
    
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("📁 파일 정보:", {
      name: file?.name,
      size: file?.size,
      type: file?.type
    })

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 })
    }

    // 파일 내용 읽기
    const text = await file.text()
    const lines = text.split("\n")
    
    console.log("📊 파일 처리 완료:", {
      totalLines: lines.length,
      firstLine: lines[0],
      secondLine: lines[1]
    })

    return NextResponse.json({
      message: "테스트 업로드 성공",
      fileName: file.name,
      fileSize: file.size,
      totalLines: lines.length
    })

  } catch (err: any) {
    console.error("테스트 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error",
      details: err.stack 
    }, { status: 500 })
  }
} 