import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase"
import * as XLSX from "xlsx"

export const runtime = "nodejs"

interface GmvData {
  video_id: string
  video_title: string
  tiktok_account: string
  creative_type: string
  status: string
  orders: number
  gross_revenue: number
  ad_impressions: number
  ad_clicks: number
  ad_click_rate: number
  ad_conversion_rate: number
  video_view_rate_2s: number
  video_view_rate_6s: number
  video_view_rate_25: number
  video_view_rate_50: number
  video_view_rate_75: number
  video_view_rate_100: number
  currency: string
  campaign_name?: string
  campaign_id?: string
  product_id?: string
  authorization_type?: string
}

export async function POST(request: NextRequest) {
  try {
    console.log("🚀 GMV 데이터 업로드 API 시작")
    
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

    // Excel 파일인지 확인
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json({ error: "Excel 파일(.xlsx, .xls)만 업로드 가능합니다." }, { status: 400 })
    }

    // Excel 파일 읽기
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet)

    console.log("📊 Excel 파일 처리 완료:", {
      totalRows: jsonData.length,
      sheetName: sheetName
    })

    // 데이터 변환 및 중복 제거
    const videoIdMap = new Map<string, GmvData>()
    
    jsonData.forEach((row: any) => {
      const videoId = row['Video ID'] || ''
      if (!videoId) return // video_id가 없으면 건너뛰기
      
      const gmvData: GmvData = {
        video_id: videoId,
        video_title: row['Video title'] || '',
        tiktok_account: row['TikTok account'] || '',
        creative_type: row['Creative type'] || '',
        status: row['Status'] || '',
        orders: Number(row['Orders (SKU)']) || 0,
        gross_revenue: parseFloat(String(row['Gross revenue']).replace(/,/g, '')) || 0,
        ad_impressions: Number(row['Product ad impressions']) || 0,
        ad_clicks: Number(row['Product ad clicks']) || 0,
        ad_click_rate: Number(row['Product ad click rate']) || 0,
        ad_conversion_rate: Number(row['Ad conversion rate']) || 0,
        video_view_rate_2s: Number(row['2-second ad video view rate']) || 0,
        video_view_rate_6s: Number(row['6-second ad video view rate']) || 0,
        video_view_rate_25: Number(row['25% ad video view rate']) || 0,
        video_view_rate_50: Number(row['50% ad video view rate']) || 0,
        video_view_rate_75: Number(row['75% ad video view rate']) || 0,
        video_view_rate_100: Number(row['100% ad video view rate']) || 0,
        currency: row['Currency'] || 'KRW',
        campaign_name: row['Campaign name'] || '',
        campaign_id: row['Campaign ID'] || '',
        product_id: row['Product ID'] || '',
        authorization_type: row['Authorization type'] || ''
      }
      
      // 중복된 video_id가 있으면 나중 것으로 덮어쓰기
      videoIdMap.set(videoId, gmvData)
    })
    
    const gmvDataList: GmvData[] = Array.from(videoIdMap.values())

    console.log("🔄 데이터 변환 완료:", {
      originalRows: jsonData.length,
      uniqueVideos: gmvDataList.length,
      duplicatesRemoved: jsonData.length - gmvDataList.length
    })

    // Supabase에 저장
    const supabase = createServerClient()

    console.log("🔍 Supabase 연결 확인 중...")

    // 먼저 테이블 존재 여부 확인
    const { data: tableCheck, error: tableError } = await supabase
      .from('gmv_data')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error("테이블 확인 오류:", tableError)
      return NextResponse.json({ 
        error: "GMV 데이터 테이블이 존재하지 않습니다.", 
        details: "Supabase에서 gmv_data 테이블을 먼저 생성해주세요.",
        tableError: tableError.message,
        code: tableError.code
      }, { status: 500 })
    }

    console.log("✅ 테이블 존재 확인 완료")

    console.log("📤 데이터 업서트 시작:", gmvDataList.length, "개 레코드")

    // upsert를 사용하여 기존 데이터는 업데이트하고 새 데이터는 추가
    const { data, error } = await supabase
      .from('gmv_data')
      .upsert(gmvDataList, {
        onConflict: 'video_id', // video_id를 기준으로 중복 체크
        ignoreDuplicates: false // 중복 시 업데이트
      })

    if (error) {
      console.error("Supabase 삽입 오류:", error)
      
      // 테이블이 존재하지 않는 경우
      if ((error as any).code === "42P01") {
        return NextResponse.json({ 
          error: "GMV 데이터 테이블이 존재하지 않습니다.", 
          details: "Supabase에서 gmv_data 테이블을 먼저 생성해주세요. 프로젝트 루트의 supabase/create-gmv-table.sql 파일을 실행하세요.",
          sqlFile: "supabase/create-gmv-table.sql"
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        error: "데이터베이스 저장 실패", 
        details: error.message || "알 수 없는 오류",
        errorCode: (error as any).code
      }, { status: 500 })
    }

    console.log("✅ Supabase 업서트 완료")

    // 업서트 후 전체 레코드 수 확인
    const { count } = await supabase
      .from('gmv_data')
      .select('*', { count: 'exact', head: true })

    return NextResponse.json({
      message: "GMV 데이터 업로드 성공",
      fileName: file.name,
      fileSize: file.size,
      processedRecords: gmvDataList.length,
      totalRecordsInDB: count,
      uploadedAt: new Date().toISOString()
    })

  } catch (err: any) {
    console.error("GMV 업로드 API 오류:", err)
    return NextResponse.json({ 
      error: err.message || "Internal server error",
      details: err.stack 
    }, { status: 500 })
  }
}