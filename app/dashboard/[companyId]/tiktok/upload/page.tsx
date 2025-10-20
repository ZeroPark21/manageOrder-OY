"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, CheckCircle, AlertCircle, FileText, Loader2 } from "lucide-react"
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

export default function UploadPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.type === "text/plain" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setFile(selectedFile)
        setMessage(null)
      } else {
        setMessage({ type: "error", text: "CSV 파일만 업로드 가능합니다." })
      }
    }
  }

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
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

  const parseNumber = (value: any): number | null => {
    if (!value || value === '' || value === '\t') return null
    const num = parseFloat(String(value).replace(/[,$]/g, ''))
    return isNaN(num) ? null : num
  }

  const parseInteger = (value: any): number => {
    if (!value || value === '' || value === '\t') return 0
    const num = parseInt(String(value).replace(/[,$]/g, ''))
    return isNaN(num) ? 0 : num
  }

  const uploadInChunks = async (orders: any[]) => {
    const CHUNK_SIZE = 100
    const MAX_CONCURRENT = 3
    let totalSaved = 0
    let totalUpdated = 0
    let totalInserted = 0

    const chunks = []
    for (let i = 0; i < orders.length; i += CHUNK_SIZE) {
      chunks.push(orders.slice(i, i + CHUNK_SIZE))
    }

    const uploadChunk = async (chunkOrders: any[], chunkIndex: number) => {
      const isLastChunk = chunkIndex === chunks.length - 1

      try {
        const response = await fetch("/api/upload/tiktok-csv-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders: chunkOrders, isLastChunk, companyId })
        })

        const result = await response.json()

        if (response.ok) {
          return {
            saved: result.saved || 0,
            updated: result.updated || 0,
            inserted: result.inserted || 0
          }
        } else {
          throw new Error(result.error || "청크 업로드 실패")
        }
      } catch (error) {
        throw error
      }
    }

    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT)
      const promises = batch.map((chunk, index) => uploadChunk(chunk, i + index))

      const results = await Promise.all(promises)
      results.forEach(result => {
        totalSaved += result.saved
        totalUpdated += result.updated
        totalInserted += result.inserted
      })

      const processed = Math.min((i + MAX_CONCURRENT) * CHUNK_SIZE, orders.length)
      setMessage({
        type: "success",
        text: `⏳ 업로드 중... ${processed}/${orders.length} 처리됨 (${Math.round(processed / orders.length * 100)}%)`
      })
    }

    return { totalSaved, totalUpdated, totalInserted }
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      console.log("🚀 Starting upload:", file.name, "Size:", file.size)

      // CSV 파일 파싱
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())

      if (lines.length < 2) {
        setMessage({ type: "error", text: "CSV 파일에 데이터가 없습니다." })
        return
      }

      const headers = parseCSVLine(lines[0])
      const orders = []
      const orderIdSet = new Set<string>()
      let skippedRows = 0

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        try {
          const values = parseCSVLine(line)
          const rowData: any = {}

          headers.forEach((header, index) => {
            rowData[header] = values[index] || ""
          })

          const orderIdRaw = rowData["Order ID"]?.toString().trim()
          const productName = rowData["Product Name"]?.toString().trim()
          const quantity = parseInteger(rowData["Quantity"])

          if (!orderIdRaw || !productName || quantity <= 0) {
            skippedRows++
            continue
          }

          const orderId = String(orderIdRaw)
          const skuId = rowData["SKU ID"]?.toString().trim()
          const rowUniqueId = `${orderId}_${skuId || productName || i}`

          if (orderIdSet.has(rowUniqueId)) {
            skippedRows++
            continue
          }
          orderIdSet.add(rowUniqueId)

          const orderData: any = {
            order_id: orderId,
            order_status: rowData["Order Status"] || null,
            order_substatus: rowData["Order Substatus"] || null,
            cancelation_return_type: rowData["Cancelation/Return Type"] || null,
            normal_or_preorder: rowData["Normal or Pre-order"] || null,
            sku_id: rowData["SKU ID"] || null,
            seller_sku: rowData["Seller SKU"] || null,
            product_name: productName,
            variation: rowData["Variation"] || null,
            quantity: quantity,
            sku_quantity_of_return: parseInteger(rowData["Sku Quantity of return"]),
            sku_unit_original_price: parseNumber(rowData["SKU Unit Original Price"]),
            sku_subtotal_before_discount: parseNumber(rowData["SKU Subtotal Before Discount"]),
            sku_platform_discount: parseNumber(rowData["SKU Platform Discount"]),
            sku_seller_discount: parseNumber(rowData["SKU Seller Discount"]),
            sku_subtotal_after_discount: parseNumber(rowData["SKU Subtotal After Discount"]),
            shipping_fee_after_discount: parseNumber(rowData["Shipping Fee After Discount"]),
            original_shipping_fee: parseNumber(rowData["Original Shipping Fee"]),
            shipping_fee_seller_discount: parseNumber(rowData["Shipping Fee Seller Discount"]),
            co_funded_shipping_fee_discount: parseNumber(rowData["Co-Funded Shipping Fee Discount"]),
            shipping_fee_platform_discount: parseNumber(rowData["Shipping Fee Platform Discount"]),
            payment_platform_discount: parseNumber(rowData["Payment platform discount"]),
            retail_delivery_fee: parseNumber(rowData["Retail Delivery Fee"]),
            taxes: parseNumber(rowData["Taxes"]),
            order_amount: parseNumber(rowData["Order Amount"]),
            order_refund_amount: parseNumber(rowData["Order Refund Amount"]),
            created_time: rowData["Created Time"] || null,
            paid_time: rowData["Paid Time"] || null,
            rts_time: rowData["RTS Time"] || null,
            shipped_time: rowData["Shipped Time"] || null,
            delivered_time: rowData["Delivered Time"] || null,
            cancelled_time: rowData["Cancelled Time"] || null,
            cancel_by: rowData["Cancel By"] || null,
            cancel_reason: rowData["Cancel Reason"] || null,
            fulfillment_type: rowData["Fulfillment Type"] || null,
            warehouse_name: rowData["Warehouse Name"] || null,
            tracking_id: rowData["Tracking ID"] || null,
            delivery_option_type: rowData["Delivery Option Type"] || null,
            delivery_option: rowData["Delivery Option"] || null,
            shipping_provider_name: rowData["Shipping Provider Name"] || null,
            buyer_message: rowData["Buyer Message"] || null,
            buyer_username: rowData["Buyer Username"] || null,
            recipient: rowData["Recipient"] || null,
            phone_number: rowData["Phone #"] || null,
            country: rowData["Country"] || null,
            state: rowData["State"] || null,
            city: rowData["City"] || null,
            zipcode: rowData["Zipcode"] || null,
            address_line_1: rowData["Address Line 1"] || null,
            address_line_2: rowData["Address Line 2"] || null,
            delivery_instruction: rowData["Delivery Instruction"] || null,
            payment_method: rowData["Payment Method"] || null,
            weight_kg: parseNumber(rowData["Weight(kg)"]),
            product_category: rowData["Product Category"] || null,
            package_id: rowData["Package ID"] || null,
            seller_note: rowData["Seller Note"] || null,
            shipping_information: rowData["Shipping Information"] || null,
            combined_listing: rowData["Combined Listing"] || null,
          }

          orders.push(orderData)
        } catch (rowError) {
          console.error(`Error parsing row ${i}:`, rowError)
          skippedRows++
        }
      }

      if (orders.length === 0) {
        setMessage({
          type: "error",
          text: "유효한 주문 데이터를 찾을 수 없습니다."
        })
        return
      }

      // 청크 업로드 실행
      const { totalSaved, totalUpdated, totalInserted } = await uploadInChunks(orders)

      const successMessage = [
        `✅ TikTok 주문 데이터 업로드 완료!`,
        `📊 총 처리: ${totalSaved}개`,
        `  - 새로 추가: ${totalInserted}개`,
        `  - 업데이트: ${totalUpdated}개`,
        skippedRows > 0 ? `⚠️ 건너뛴 행: ${skippedRows}개` : "",
      ]
        .filter(Boolean)
        .join("\n")

      setMessage({
        type: "success",
        text: successMessage,
      })
      setFile(null)
      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      console.error("💥 Upload error:", error)
      setMessage({
        type: "error",
        text: `업로드 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
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
              <BreadcrumbLink href="/">제품 발송 현황</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>제품 데이터 업로드</BreadcrumbPage>
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
                <Upload className="h-5 w-5" />
                TTS 제품 데이터 업로드
              </CardTitle>
              <CardDescription>
                TTS 제품 발송 데이터 CSV 파일을 업로드하세요.
                <br />
                <small className="text-muted-foreground">지원 형식: .csv 파일 (최대 10MB, 최대 500행)</small>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">CSV 파일 선택</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
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
                <Button variant="outline" onClick={() => router.push(`/dashboard/${companyId}`)}>
                  대시보드로 이동
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>참고사항:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV 파일의 첫 번째 행은 헤더로 처리됩니다</li>
                  <li>필수 컬럼: Order ID, Product Name, Quantity</li>
                  <li>날짜 형식: MM/DD/YYYY HH:mm:ss AM/PM</li>
                  <li>빈 행이나 유효하지 않은 데이터는 자동으로 건너뜁니다</li>
                  <li>대용량 파일의 경우 처리 시간이 오래 걸릴 수 있습니다</li>
                  <li>일부 배치가 실패해도 성공한 데이터는 저장됩니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
