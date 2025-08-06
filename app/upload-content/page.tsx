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
    if (selectedFile) {
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.type === "text/plain"
      ) {
        setFile(selectedFile)
        setMessage(null)
      } else {
        setMessage({ type: "error", text: "CSV 파일만 업로드 가능합니다. Excel 파일은 CSV로 변환 후 업로드해주세요." })
      }
    }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      console.log("🚀 Starting content upload:", file.name, "Size:", file.size)

      // 간단한 버전의 API 사용 (타임아웃 방지)
      const response = await fetch("/api/upload-content-simple", {
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

      const uploadedCount = result.uploadedCount || result.processedCount || 0
      let messageText = `✅ 콘텐츠 데이터 업로드 완료!\n📊 업로드된 콘텐츠: ${uploadedCount}개`
      
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
                <small className="text-muted-foreground">지원 형식: .csv 파일 (최대 10MB)</small>
                <br />
                <small className="text-yellow-600">⚠️ Excel 파일(.xlsx)은 CSV로 변환 후 업로드해주세요.</small>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">CSV 파일 선택</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,text/csv,text/plain"
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
                  <li className="text-yellow-600">Excel 파일은 먼저 CSV로 저장해주세요 (파일 → 다른 이름으로 저장 → CSV)</li>
                  <li>빈 행이나 유효하지 않은 데이터는 자동으로 건너뜁니다</li>
                  <li>대용량 파일의 경우 처리 시간이 오래 걸릴 수 있습니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
