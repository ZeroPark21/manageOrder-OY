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
import { Upload, CheckCircle, AlertCircle, FileText, Loader2, Video } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function TikTokDataUploadPage({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params)
  const router = useRouter()

  // 판매 데이터 상태
  const [salesFile, setSalesFile] = useState<File | null>(null)
  const [salesUploading, setSalesUploading] = useState(false)
  const [salesMessage, setSalesMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 콘텐츠 데이터 상태
  const [contentFile, setContentFile] = useState<File | null>(null)
  const [contentUploading, setContentUploading] = useState(false)
  const [contentMessage, setContentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // 판매 데이터 업로드 핸들러
  const handleSalesFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (
        selectedFile.type === "text/csv" ||
        selectedFile.name.endsWith(".csv") ||
        selectedFile.type === "text/plain" ||
        selectedFile.type === "application/vnd.ms-excel"
      ) {
        setSalesFile(selectedFile)
        setSalesMessage(null)
      } else {
        setSalesMessage({ type: "error", text: "CSV 파일만 업로드 가능합니다." })
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

  const uploadSalesInChunks = async (orders: any[]) => {
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
      setSalesMessage({
        type: "success",
        text: `⏳ 업로드 중... ${processed}/${orders.length} 처리됨 (${Math.round(processed / orders.length * 100)}%)`
      })
    }

    return { totalSaved, totalUpdated, totalInserted }
  }

  const handleSalesUpload = async () => {
    if (!salesFile) return

    setSalesUploading(true)
    setSalesMessage(null)

    try {
      // CSV 파일 파싱
      const text = await salesFile.text()
      const lines = text.split(/\r?\n/).filter((line) => line.trim())

      if (lines.length < 2) {
        setSalesMessage({ type: "error", text: "CSV 파일에 데이터가 없습니다." })
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
        setSalesMessage({
          type: "error",
          text: "유효한 주문 데이터를 찾을 수 없습니다."
        })
        return
      }

      // 청크 업로드 실행
      const { totalSaved, totalUpdated, totalInserted } = await uploadSalesInChunks(orders)

      const successMessage = [
        `✅ TikTok 주문 데이터 업로드 완료!`,
        `📊 총 처리: ${totalSaved}개`,
        `  - 새로 추가: ${totalInserted}개`,
        `  - 업데이트: ${totalUpdated}개`,
        skippedRows > 0 ? `⚠️ 건너뛴 행: ${skippedRows}개` : "",
      ]
        .filter(Boolean)
        .join("\n")

      setSalesMessage({
        type: "success",
        text: successMessage,
      })
      setSalesFile(null)
      const fileInput = document.getElementById("sales-file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      setSalesMessage({
        type: "error",
        text: `업로드 중 오류: ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
      })
    } finally {
      setSalesUploading(false)
    }
  }

  // 콘텐츠 데이터 업로드 핸들러
  const handleContentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setContentFile(selectedFile)
        setContentMessage(null)
      } else {
        setContentMessage({ type: "error", text: "CSV 또는 Excel 파일만 업로드 가능합니다." })
      }
    }
  }

  const parseDate = (value: any): string => {
    if (!value) return new Date().toISOString().split('T')[0]
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
    return new Date().toISOString().split('T')[0]
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
    const CHUNK_SIZE = 20
    const MAX_CONCURRENT = 3
    let totalSaved = 0

    let skippedNoDate = 0
    let skippedNoLink = 0

    const transformedData = data.map((row) => {
      const publishDate = row['Video post date'] || row['publish_date']
      const videoLink = row['Video link'] || row['video_link']

      if (!publishDate) {
        skippedNoDate++
        return null
      }

      if (!videoLink || videoLink.trim() === '') {
        skippedNoLink++
        return null
      }

      return {
        content_title: (row['Video name'] || row['video_name'] || 'Untitled').substring(0, 255),
        video_link: videoLink.substring(0, 255),
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
    }).filter(c => c !== null)

    const chunks = []
    for (let i = 0; i < transformedData.length; i += CHUNK_SIZE) {
      chunks.push(transformedData.slice(i, i + CHUNK_SIZE))
    }

    const uploadChunk = async (contents: any[], chunkIndex: number) => {
      const isLastChunk = chunkIndex === chunks.length - 1

      try {
        const response = await fetch("/api/upload/upload-content-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents, isLastChunk, companyId: companyId || "" })
        })

        let result
        try {
          result = await response.json()
        } catch (parseError) {
          return 0
        }

        if (response.ok) {
          return result.saved || 0
        } else {
          return 0
        }
      } catch (error) {
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
      setContentMessage({
        type: "success",
        text: `⏳ 업로드 중... ${processed}/${transformedData.length} 처리됨 (${Math.round(processed / transformedData.length * 100)}%)`
      })
    }

    return totalSaved
  }

  const handleContentUpload = async () => {
    if (!contentFile) return

    setContentUploading(true)
    setContentMessage(null)

    try {
      if (contentFile.size > 100000) {
        let data: any[] = []

        if (contentFile.name.endsWith('.csv')) {
          const text = await contentFile.text()
          data = parseCSVContent(text)
        } else if (contentFile.name.endsWith('.xlsx') || contentFile.name.endsWith('.xls')) {
          const XLSX = await import('xlsx')
          const buffer = await contentFile.arrayBuffer()
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

        setContentMessage({
          type: "success",
          text: `✅ 콘텐츠 데이터 업로드 완료!\n📊 업로드된 콘텐츠: ${totalSaved}개`
        })
        setContentFile(null)

        const fileInput = document.getElementById("content-file-upload") as HTMLInputElement
        if (fileInput) fileInput.value = ""

        return
      }

      const formData = new FormData()
      formData.append("file", contentFile)
      formData.append("companyId", companyId)

      const response = await fetch("/api/upload/upload-content", {
        method: "POST",
        body: formData,
      })

      const contentType = response.headers.get("content-type")
      let result

      if (contentType && contentType.includes("application/json")) {
        result = await response.json()
      } else {
        const text = await response.text()
        throw new Error(`서버에서 예상치 못한 응답을 받았습니다: ${text.substring(0, 100)}`)
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || `HTTP ${response.status} 오류`)
      }

      const processedCount = result.processedCount || 0
      const insertedCount = result.insertedCount || 0
      const updatedCount = result.updatedCount || 0

      let messageText = `✅ 콘텐츠 데이터 업로드 완료!\n📊 처리된 콘텐츠: ${processedCount}개`

      if (insertedCount > 0 || updatedCount > 0) {
        messageText += `\n  - 새로 추가: ${insertedCount}개`
        messageText += `\n  - 업데이트: ${updatedCount}개`
      }

      setContentMessage({
        type: "success",
        text: messageText,
      })
      setContentFile(null)

      const fileInput = document.getElementById("content-file-upload") as HTMLInputElement
      if (fileInput) fileInput.value = ""
    } catch (error) {
      setContentMessage({
        type: "error",
        text: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.",
      })
    } finally {
      setContentUploading(false)
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
              <BreadcrumbLink href={`/dashboard/${companyId}`}>대시보드</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>TikTok 데이터 업로드</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="max-w-2xl mx-auto w-full">
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sales">판매 데이터</TabsTrigger>
              <TabsTrigger value="content">콘텐츠 데이터</TabsTrigger>
            </TabsList>

            {/* 판매 데이터 탭 */}
            <TabsContent value="sales">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    TikTok 판매 데이터 업로드
                  </CardTitle>
                  <CardDescription>
                    TikTok Shop 판매 데이터 CSV 파일을 업로드하세요.
                    <br />
                    <small className="text-muted-foreground">지원 형식: .csv 파일 (최대 10MB)</small>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sales-file-upload">CSV 파일 선택</Label>
                    <Input
                      id="sales-file-upload"
                      type="file"
                      accept=".csv,text/csv,text/plain,application/vnd.ms-excel"
                      onChange={handleSalesFileChange}
                      disabled={salesUploading}
                    />
                  </div>

                  {salesFile && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <p className="text-sm font-medium">선택된 파일</p>
                      </div>
                      <p className="text-sm">
                        <strong>파일명:</strong> {salesFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>크기:</strong> {(salesFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}

                  {salesMessage && (
                    <Alert variant={salesMessage.type === "error" ? "destructive" : "default"}>
                      {salesMessage.type === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription className="whitespace-pre-line">{salesMessage.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleSalesUpload} disabled={!salesFile || salesUploading} className="flex-1">
                      {salesUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        "업로드"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/dashboard/${companyId}/tiktok/samples`)}>
                      판매 분석 보기
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>참고사항:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>필수 컬럼: Order ID, Product Name, Quantity</li>
                      <li>날짜 형식: MM/DD/YYYY HH:mm:ss AM/PM</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 콘텐츠 데이터 탭 */}
            <TabsContent value="content">
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
                    <Label htmlFor="content-file-upload">파일 선택</Label>
                    <Input
                      id="content-file-upload"
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={handleContentFileChange}
                      disabled={contentUploading}
                    />
                  </div>

                  {contentFile && (
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <p className="text-sm font-medium">선택된 파일</p>
                      </div>
                      <p className="text-sm">
                        <strong>파일명:</strong> {contentFile.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <strong>크기:</strong> {(contentFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  )}

                  {contentMessage && (
                    <Alert variant={contentMessage.type === "error" ? "destructive" : "default"}>
                      {contentMessage.type === "success" ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <AlertCircle className="h-4 w-4" />
                      )}
                      <AlertDescription className="whitespace-pre-line">{contentMessage.text}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleContentUpload} disabled={!contentFile || contentUploading} className="flex-1">
                      {contentUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          업로드 중...
                        </>
                      ) : (
                        "업로드"
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => router.push(`/dashboard/${companyId}/tiktok/content`)}>
                      콘텐츠 분석 보기
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><strong>참고사항:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>필수 컬럼: Video name, Creator username, Video post date</li>
                      <li>날짜 형식: MM/DD/YYYY 또는 YYYY-MM-DD</li>
                      <li>Excel 파일(.xlsx, .xls)도 직접 업로드 가능</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  )
}
