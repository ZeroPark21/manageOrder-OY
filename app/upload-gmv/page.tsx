"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react"

export default function UploadGmvPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    details?: any
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setUploadResult(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadResult({
        success: false,
        message: "파일을 선택해주세요."
      })
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-gmv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: "GMV 데이터가 성공적으로 업로드되었습니다!",
          details: result
        })
        setFile(null)
        // 파일 입력 초기화
        const fileInput = document.getElementById('file-upload') as HTMLInputElement
        if (fileInput) {
          fileInput.value = ''
        }
      } else {
        setUploadResult({
          success: false,
          message: result.error || "업로드 실패",
          details: result.details
        })
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: "업로드 중 오류가 발생했습니다.",
        details: error
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-6 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">GMV 데이터 업로드</h2>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Excel 파일 업로드
            </CardTitle>
            <CardDescription>
              GMV 데이터가 포함된 Excel 파일을 업로드하여 Supabase에 저장합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Excel 파일 선택</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>

            {file && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">선택된 파일:</h4>
                <p className="text-sm text-blue-700">
                  이름: {file.name}
                </p>
                <p className="text-sm text-blue-700">
                  크기: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  업로드 중...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  GMV 데이터 업로드
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {uploadResult && (
          <Alert variant={uploadResult.success ? "default" : "destructive"}>
            {uploadResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div>
                <p className="font-medium">{uploadResult.message}</p>
                {uploadResult.details && (
                  <div className="mt-2 text-sm">
                    {uploadResult.success ? (
                      <div>
                        <p>파일명: {uploadResult.details.fileName}</p>
                        <p>업로드된 레코드 수: {uploadResult.details.totalRecords}</p>
                        <p>업로드 시간: {new Date(uploadResult.details.uploadedAt).toLocaleString('ko-KR')}</p>
                      </div>
                    ) : (
                      <p>오류 상세: {uploadResult.details}</p>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>업로드 가이드</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Excel 파일(.xlsx, .xls)만 업로드 가능합니다.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>파일에는 Video ID, Video title, TikTok account, Orders (SKU), Gross revenue 등의 컬럼이 포함되어야 합니다.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>업로드 시 기존 데이터는 새 데이터로 완전히 교체됩니다.</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>업로드 완료 후 GMV MAX 분석 페이지에서 실제 데이터를 확인할 수 있습니다.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}