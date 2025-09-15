"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, FileText, Loader2, Video } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function UploadContentPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    console.log("🔍 Selected file:", {
      name: selectedFile?.name,
      type: selectedFile?.type,
      size: selectedFile?.size
    })
    
    if (selectedFile) {
      const isValidFile = (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.type === "text/plain" ||
        selectedFile.type === "application/vnd.ms-excel" ||
        selectedFile.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        selectedFile.name.endsWith(".xlsx") ||
        selectedFile.name.endsWith(".xls")
      )
      
      console.log("🔍 File validation:", isValidFile)
      
      if (isValidFile) {
        setFile(selectedFile)
        setMessage(null)
        console.log("✅ File accepted and set")
      } else {
        setMessage({ type: "error", text: "CSV 또는 Excel 파일만 업로드 가능합니다." })
        console.log("❌ File rejected")
      }
    }
  }

  // 날짜 파싱 헬퍼 함수
  const parseDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0]
    
    const dateStr = value.toString().trim()
    
    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0]
    }
    
    // MM/DD/YYYY 형식
    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    // M/D/YYYY 형식 (8/6/2025 같은 경우)
    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [month, day, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }
    
    return new Date().toISOString().split('T')[0]
  }

  // CSV 파싱 헬퍼 함수 - 적절한 CSV 파싱
  const parseCSVContent = (text: string) => {
    if (!text || typeof text !== 'string') return []
    
    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (!lines || lines.length < 2) return []
    
    // CSV 라인을 제대로 파싱하는 함수
    const parseCSVLine = (line: string): string[] => {
      if (!line || typeof line !== 'string') return []
      
      const result = []
      let current = ''
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            // 이스케이프된 따옴표
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      
      result.push(current.trim())
      return result
    }
    
    const headers = parseCSVLine(lines[0])
    if (!headers || headers.length === 0) return []
    
    const data: any[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (!values || !headers || values.length !== headers.length) continue // 안전성 체크 추가
      
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
    
    return data
  }

  // 청크 업로드 함수
  const uploadInChunks = async (data: any[]) => {
    const CHUNK_SIZE = 10
    let totalSaved = 0
    
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE)
      const isLastChunk = i + CHUNK_SIZE >= data.length
      
      // 데이터 변환 - Video post date가 있으면 모두 포함
      const contents = chunk.map(row => {
        const publishDate = row['Video post date'] || row['publish_date']
        // Video post date가 없으면 건너뛰기
        if (!publishDate) return null
        
        return {
          content_title: (row['Video name'] || row['video_name'] || 'Untitled').substring(0, 255),
          video_link: (row['Video link'] || row['video_link'] || '').substring(0, 255),
          publish_date: parseDate(publishDate),
          creator_name: (row['Creator username'] || row['creator_name'] || '알 수 없음').substring(0, 100),
          gmv: parseFloat(row['GMV'] || row['gmv'] || '0') || 0,
          affiliate_items_sold: parseInt(row['Affiliate items sold '] || row['Affiliate items sold'] || row['affiliate_items_sold'] || '0') || 0,
          affiliate_gmv: parseFloat(row['Affiliate shoppable video GMV'] || row['affiliate_gmv'] || '0') || 0,
          shoppable_avg_order_value: parseFloat(row['Shoppable video avg. order value'] || row['shoppable_avg_order_value'] || '0') || 0,
          est_commission: parseFloat(row['Est. commission'] || row['est_commission'] || '0') || 0,
          est_flat_fee: (row['Est. flat fee'] || row['est_flat_fee'] || '--').toString().substring(0, 50),
          affiliate_orders: parseInt(row['Affiliate orders'] || row['affiliate_orders'] || '0') || 0,
          shoppable_impressions: parseInt(row['Shoppable video impressions'] || row['shoppable_impressions'] || '0') || 0,
          affiliate_ctr: parseFloat(row['Affiliate CTR'] || row['affiliate_ctr'] || '0') || 0,
          shoppable_gpm: parseFloat(row['Shoppable video GPM'] || row['shoppable_gpm'] || '0') || 0,
          affiliate_items_refunded: parseInt(row['Affiliate items refunded'] || row['affiliate_items_refunded'] || '0') || 0,
          affiliate_refunded_gmv: parseFloat(row['Affiliate refunded GMV'] || row['affiliate_refunded_gmv'] || '0') || 0,
          comment_count: parseInt(row['Shoppable video comments'] || row['comment_count'] || '0') || 0,
          like_count: parseInt(row['Shoppable video likes'] || row['like_count'] || '0') || 0
        }
      }).filter(c => c !== null) // Video post date가 있는 것만 포함
      
      if (contents.length === 0) continue
      
      const response = await fetch("/api/upload/upload-content-chunk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents, isLastChunk })
      })
      
      if (response.ok) {
        const result = await response.json()
        totalSaved += result.saved || 0
      }
      
      // 진행 상황 업데이트
      setMessage({
        type: "success",
        text: `⏳ 업로드 중... ${Math.min(i + CHUNK_SIZE, data.length)}/${data.length} 처리됨`
      })
    }
    
    return totalSaved
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      console.log("🚀 Starting content upload:", file.name, "Size:", file.size)

      // 100KB 이상의 CSV 파일은 청크 업로드 사용
      if (file.name.endsWith('.csv') && file.size > 100000) {
        console.log("📊 대용량 CSV 파일 - 청크 업로드 사용")
        
        const text = await file.text()
        const data = parseCSVContent(text)
        
        if (data.length === 0) {
          throw new Error("유효한 데이터가 없습니다")
        }
        
        const totalSaved = await uploadInChunks(data)
        
        setMessage({
          type: "success",
          text: `✅ 콘텐츠 데이터 업로드 완료!\n📊 업로드된 콘텐츠: ${totalSaved}개`
        })
        setFile(null)
        
        // 파일 입력 초기화
        const fileInput = document.getElementById("file-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""
        
        return
      }

      // 일반 업로드 (작은 파일 또는 Excel)
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/upload-content-v2", {
        method: "POST",
        body: formData,
      })

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type")
      console.log("응답 Content-Type:", contentType)
      
      let result
      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        // JSON이 아닌 경우 텍스트로 읽기
        const text = await response.text()
        console.error("JSON이 아닌 응답:", text)
        throw new Error(`서버 오류가 발생했습니다: ${text.substring(0, 100)}...`)
      }

      if (!response.ok) {
        console.error("업로드 오류 응답:", result)
        throw new Error(result.error || `업로드에 실패했습니다. (${response.status})`)
      }

      const processedCount = result.processedCount || 0
      const insertedCount = result.insertedCount || 0
      const updatedCount = result.updatedCount || 0
      const totalProcessed = insertedCount + updatedCount
      
      let messageText = `✅ 콘텐츠 데이터 업로드 완료!\n📊 처리된 콘텐츠: ${processedCount}개`
      
      if (insertedCount > 0 || updatedCount > 0) {
        messageText += `\n  - 새로 추가: ${insertedCount}개`
        messageText += `\n  - 업데이트: ${updatedCount}개`
      }
      
      if (result.note) {
        messageText += `\n⚠️ ${result.note}`
      }
      
      setMessage({
        type: "success",
        text: messageText,
      })
      setFile(null)

      // 파일 입력 초기화
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("💥 Upload error:", error)
      setMessage({
        type: "error",
        text: `네트워크 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* 헤더 */}
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/">TTS 대시보드</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="/content">콘텐츠 발행 현황</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>콘텐츠 데이터 업로드</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                콘텐츠 발행 데이터 업로드
              </CardTitle>
              <CardDescription>
                TikTok 시딩 콘텐츠 발행 데이터 파일을 업로드하세요.
                <br />
                <small className="text-muted-foreground">지원 형식: .csv, .xlsx, .xls 파일 (최대 10MB)</small>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">파일 선택</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </div>

              {file && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <p className="text-sm font-medium">선택된 파일</p>
                  </div>
                  <p className="text-sm">
                    <strong>파일명:</strong> {file.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>크기:</strong> {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>타입:</strong> {file.type || "unknown"}
                  </p>
                </div>
              )}

              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  {message.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription className="whitespace-pre-line">{message.text}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!file || uploading} className="flex-1">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      업로드 중...
                    </>
                  ) : (
                    "업로드"
                  )}
                </Button>
                <Button variant="outline" onClick={() => (window.location.href = "/content")}>
                  콘텐츠 대시보드로 이동
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>참고사항:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV 파일의 첫 번째 행은 헤더로 처리됩니다</li>
                  <li>필수 컬럼: Video name, Creator username, Video post date 등</li>
                  <li>날짜 형식: MM/DD/YYYY 또는 YYYY-MM-DD</li>
                  <li className="text-green-600">Excel 파일(.xlsx, .xls)도 직접 업로드 가능합니다</li>
                  <li>빈 행이나 유효하지 않은 데이터는 자동으로 건너뜁니다</li>
                  <li>대용량 파일의 경우 처리 시간이 오래 걸릴 수 있습니다</li>
                  <li className="text-blue-600">CSV 파일이 100KB 이상인 경우 자동으로 청크 업로드 방식을 사용합니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
