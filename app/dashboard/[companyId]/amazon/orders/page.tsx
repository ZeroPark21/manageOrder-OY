"use client"

import type React from "react"
import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, AlertCircle, FileText, Loader2, Package } from "lucide-react"
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

export default function UploadOrdersPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]

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

      if (isValidFile) {
        setFile(selectedFile)
        setMessage(null)
      } else {
        setMessage({ type: "error", text: "CSV 또는 Excel 파일만 업로드 가능합니다." })
      }
    }
  }

  const parseDate = (value: any): string | null => {
    if (!value) return null

    const dateStr = value.toString().trim()

    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      return dateStr.split('T')[0]
    }

    if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [month, day, year] = dateStr.split('/')
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    const parts = dateStr.split('/')
    if (parts.length === 3) {
      const [month, day, year] = parts
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return null
  }

  const parseCSVContent = (text: string) => {
    if (!text || typeof text !== 'string') return []

    const lines = text.split(/\r?\n/).filter(line => line.trim())
    if (!lines || lines.length < 2) return []

    const parseCSVLine = (line: string): string[] => {
      if (!line || typeof line !== 'string') return []

      const result = []
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

    const headers = parseCSVLine(lines[0])
    if (!headers || headers.length === 0) return []

    const data: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (!values || !headers || values.length !== headers.length) continue

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }

    return data
  }

  const uploadInChunks = async (data: any[]) => {
    console.log(`📊 [시작] 전체 데이터 행: ${data.length}개`)

    const CHUNK_SIZE = 50
    const MAX_CONCURRENT = 3
    let totalSaved = 0

    const transformedData = data.map((row) => {
      const orderDate = row['purchase-date'] || row['Purchase Date'] || row['order_date']
      const shipDate = row['ship-date'] || row['Ship Date'] || row['ship_date']

      if (!orderDate) {
        return null
      }

      return {
        order_id: (row['amazon-order-id'] || row['Order ID'] || row['order_id'] || '').substring(0, 50),
        order_item_id: (row['amazon-order-item-id'] || row['Order Item ID'] || row['order_item_id'] || '').substring(0, 50),
        purchase_date: parseDate(orderDate),
        payments_date: parseDate(row['payments-date'] || row['Payments Date'] || row['payments_date']),
        ship_date: shipDate ? parseDate(shipDate) : null,
        buyer_email: (row['buyer-email'] || row['Buyer Email'] || row['buyer_email'] || '').substring(0, 255),
        buyer_name: (row['buyer-name'] || row['Buyer Name'] || row['buyer_name'] || '').substring(0, 255),
        buyer_phone_number: (row['buyer-phone-number'] || row['Buyer Phone'] || row['buyer_phone_number'] || '').substring(0, 50),
        sku: (row['sku'] || row['SKU'] || '').substring(0, 100),
        product_name: (row['product-name'] || row['Product Name'] || row['product_name'] || '').substring(0, 500),
        asin: (row['asin'] || row['ASIN'] || '').substring(0, 20),
        quantity_purchased: parseInt(row['quantity-purchased'] || row['Quantity'] || row['quantity'] || '0') || 0,
        currency: (row['currency'] || row['Currency'] || 'USD').substring(0, 10),
        item_price: parseFloat(row['item-price'] || row['Item Price'] || row['item_price'] || '0') || 0,
        item_tax: parseFloat(row['item-tax'] || row['Item Tax'] || row['item_tax'] || '0') || 0,
        shipping_price: parseFloat(row['shipping-price'] || row['Shipping Price'] || row['shipping_price'] || '0') || 0,
        shipping_tax: parseFloat(row['shipping-tax'] || row['Shipping Tax'] || row['shipping_tax'] || '0') || 0,
        gift_wrap_price: parseFloat(row['gift-wrap-price'] || row['Gift Wrap Price'] || row['gift_wrap_price'] || '0') || 0,
        gift_wrap_tax: parseFloat(row['gift-wrap-tax'] || row['Gift Wrap Tax'] || row['gift_wrap_tax'] || '0') || 0,
        ship_service_level: (row['ship-service-level'] || row['Service Level'] || row['ship_service_level'] || '').substring(0, 100),
        recipient_name: (row['recipient-name'] || row['Recipient Name'] || row['recipient_name'] || '').substring(0, 255),
        ship_address_1: (row['ship-address-1'] || row['Address 1'] || row['ship_address_1'] || '').substring(0, 500),
        ship_address_2: (row['ship-address-2'] || row['Address 2'] || row['ship_address_2'] || '').substring(0, 500),
        ship_address_3: (row['ship-address-3'] || row['Address 3'] || row['ship_address_3'] || '').substring(0, 500),
        ship_city: (row['ship-city'] || row['City'] || row['ship_city'] || '').substring(0, 100),
        ship_state: (row['ship-state'] || row['State'] || row['ship_state'] || '').substring(0, 100),
        ship_postal_code: (row['ship-postal-code'] || row['Postal Code'] || row['ship_postal_code'] || '').substring(0, 20),
        ship_country: (row['ship-country'] || row['Country'] || row['ship_country'] || '').substring(0, 100),
        item_promotion_discount: parseFloat(row['item-promotion-discount'] || row['Promotion Discount'] || row['item_promotion_discount'] || '0') || 0,
        ship_promotion_discount: parseFloat(row['ship-promotion-discount'] || row['Ship Promotion Discount'] || row['ship_promotion_discount'] || '0') || 0,
        item_status: (row['item-status'] || row['Item Status'] || row['item_status'] || '').substring(0, 50),
        fulfillment_channel: (row['fulfillment-channel'] || row['Fulfillment Channel'] || row['fulfillment_channel'] || '').substring(0, 50),
        sales_channel: (row['sales-channel'] || row['Sales Channel'] || row['sales_channel'] || '').substring(0, 100),
        order_channel: (row['order-channel'] || row['Order Channel'] || row['order_channel'] || '').substring(0, 50),
        is_business_order: row['is-business-order'] === 'true' || row['is-business-order'] === 'TRUE',
        is_prime: row['is-prime'] === 'true' || row['is-prime'] === 'TRUE',
        is_premium_order: row['is-premium-order'] === 'true' || row['is-premium-order'] === 'TRUE',
        price_designation: (row['price-designation'] || row['Price Designation'] || '').substring(0, 50)
      }
    }).filter(c => c !== null)

    console.log(`📊 [필터링 결과] 유효한 데이터: ${transformedData.length}개`)

    const chunks = []
    for (let i = 0; i < transformedData.length; i += CHUNK_SIZE) {
      chunks.push(transformedData.slice(i, i + CHUNK_SIZE))
    }

    const uploadChunk = async (orders: any[], chunkIndex: number) => {
      const isLastChunk = chunkIndex === chunks.length - 1

      try {
        const response = await fetch("/api/upload/upload-orders-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orders, isLastChunk, companyId: companyId || "" })
        })

        let result
        try {
          result = await response.json()
        } catch (parseError) {
          console.log(`청크 ${chunkIndex} 응답 파싱 오류:`, parseError)
          return 0
        }

        if (response.ok) {
          return result.saved || 0
        } else {
          console.error(`청크 ${chunkIndex} 업로드 실패:`, result.error)
          return 0
        }
      } catch (error) {
        console.log(`청크 ${chunkIndex} 요청 오류:`, error)
        return 0
      }
    }

    for (let i = 0; i < chunks.length; i += MAX_CONCURRENT) {
      const batch = chunks.slice(i, i + MAX_CONCURRENT)
      const promises = batch.map((chunk, index) => uploadChunk(chunk, i + index))

      const results = await Promise.all(promises)
      const batchSaved = results.reduce((sum, saved) => sum + saved, 0)
      totalSaved += batchSaved

      const processed = Math.min((i + MAX_CONCURRENT) * CHUNK_SIZE, transformedData.length)
      setMessage({
        type: "success",
        text: `⏳ 업로드 중... ${processed}/${transformedData.length} 처리됨 (${Math.round(processed / transformedData.length * 100)}%)`
      })
    }

    return totalSaved
  }

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setMessage(null)

    try {
      if (file.size > 100000) {
        let data: any[] = []

        if (file.name.endsWith('.csv')) {
          const text = await file.text()
          data = parseCSVContent(text)
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
          const XLSX = await import('xlsx')

          const buffer = await file.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'buffer' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          data = XLSX.utils.sheet_to_json(worksheet)
        } else {
          throw new Error("지원하지 않는 파일 형식입니다.")
        }

        if (data.length === 0) {
          throw new Error("유효한 데이터가 없습니다")
        }

        const totalSaved = await uploadInChunks(data)

        setMessage({
          type: "success",
          text: `✅ 주문 데이터 업로드 완료!\n📊 업로드된 주문: ${totalSaved}개`
        })
        setFile(null)

        const fileInput = document.getElementById("file-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        return
      }

      const formData = new FormData()
      formData.append("file", file)
      formData.append("companyId", companyId)

      const response = await fetch("/api/upload/upload-orders", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "업로드에 실패했습니다.")
      }

      const processedCount = result.processedCount || 0
      const insertedCount = result.insertedCount || 0
      const updatedCount = result.updatedCount || 0

      let messageText = `✅ 주문 데이터 업로드 완료!\n📊 처리된 주문: ${processedCount}개`

      if (insertedCount > 0 || updatedCount > 0) {
        messageText += `\n  - 새로 추가: ${insertedCount}개`
        messageText += `\n  - 업데이트: ${updatedCount}개`
      }

      setMessage({
        type: "success",
        text: messageText,
      })
      setFile(null)

      const fileInput = document.getElementById("file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      let errorMessage = "업로드 중 오류가 발생했습니다."

      if (error instanceof Error) {
        errorMessage = error.message
      }

      setMessage({
        type: "error",
        text: errorMessage,
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/dashboard/${companyId}`}>대시보드</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href={`/dashboard/${companyId}/amazon/overview`}>Amazon</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>주문 데이터 업로드</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Amazon 주문 데이터 업로드
              </CardTitle>
              <CardDescription>
                Amazon 주문 내역 CSV 파일을 업로드하세요.
                <br />
                <small className="text-muted-foreground">지원 형식: .csv, .xlsx, .xls 파일</small>
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
                <Button variant="outline" onClick={() => router.push(`/dashboard/${companyId}/amazon/overview`)}>
                  Amazon 대시보드로 이동
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  <strong>참고사항:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>CSV 파일의 첫 번째 행은 헤더로 처리됩니다</li>
                  <li>필수 컬럼: amazon-order-id, purchase-date, sku, product-name 등</li>
                  <li>날짜 형식: MM/DD/YYYY 또는 YYYY-MM-DD</li>
                  <li>Excel 파일(.xlsx, .xls)도 직접 업로드 가능합니다</li>
                  <li>중복된 주문은 자동으로 업데이트됩니다</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}