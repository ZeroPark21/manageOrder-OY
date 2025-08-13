// 엑셀 다운로드를 위한 유틸리티 함수들
import * as XLSX from 'xlsx'

export interface ExcelData {
  headers: string[]
  rows: (string | number)[][]
  filename: string
  sheetName: string
}

export interface MultiSheetExcelData {
  sheets: {
    name: string
    headers: string[]
    rows: (string | number)[][]
  }[]
  filename: string
}

export function downloadExcel(data: ExcelData) {
  // 새 워크북 생성
  const wb = XLSX.utils.book_new()
  
  // 헤더와 데이터 합치기
  const sheetData = [data.headers, ...data.rows]
  
  // 워크시트 생성
  const ws = XLSX.utils.aoa_to_sheet(sheetData)
  
  // 열 너비 자동 조정
  const colWidths = data.headers.map((header, index) => {
    const maxLength = Math.max(
      String(header).length,
      ...data.rows.map(row => String(row[index] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  ws['!cols'] = colWidths
  
  // 워크북에 시트 추가
  XLSX.utils.book_append_sheet(wb, ws, data.sheetName || 'Sheet1')
  
  // Excel 파일 생성 및 다운로드
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${data.filename}.xlsx`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// xlsx 라이브러리를 사용한 안정적인 Excel 생성
export function downloadMultiSheetExcel(data: MultiSheetExcelData) {
  console.log("🔧 Creating multi-sheet Excel with", data.sheets.length, "sheets")

  // 새 워크북 생성
  const wb = XLSX.utils.book_new()

  // 각 시트 생성
  data.sheets.forEach((sheet) => {
    console.log(`📋 Creating sheet: ${sheet.name} with ${sheet.rows.length} rows`)
    console.log(`   Headers: ${sheet.headers.length}`)
    console.log(`   First row data:`, sheet.rows[0]?.slice(0, 5))

    // 헤더와 데이터 합치기
    const sheetData = [sheet.headers, ...sheet.rows]
    
    // 워크시트 생성
    const ws = XLSX.utils.aoa_to_sheet(sheetData)
    
    // 열 너비 자동 조정
    const colWidths = sheet.headers.map((header, index) => {
      const maxLength = Math.max(
        String(header).length,
        ...sheet.rows.map(row => String(row[index] || '').length)
      )
      return { wch: Math.min(maxLength + 2, 50) }
    })
    ws['!cols'] = colWidths
    
    // 헤더 스타일 (첫 번째 행)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
      if (ws[cellAddress]) {
        ws[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
          }
        }
      }
    }
    
    // 마지막 행 스타일 (총계 행)
    if (sheet.rows.length > 0) {
      const lastRowIndex = sheet.rows.length
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: lastRowIndex, c: col })
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "D9E1F2" } },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
              top: { style: "medium", color: { rgb: "000000" } },
              bottom: { style: "medium", color: { rgb: "000000" } },
              left: { style: "thin", color: { rgb: "000000" } },
              right: { style: "thin", color: { rgb: "000000" } }
            }
          }
        }
      }
    }
    
    // 워크북에 시트 추가
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  })

  // Excel 파일 생성 및 다운로드
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${data.filename}.xlsx`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  console.log("✅ Excel file download initiated")
}


export function formatDateForExcel(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  })
}

export function formatWeekRangeForExcel(weekKey: string): string {
  const startDate = new Date(weekKey) // 월요일
  const endDate = new Date(startDate)
  endDate.setDate(startDate.getDate() + 6) // 일요일

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ko-KR", {
      month: "2-digit",
      day: "2-digit",
    })
  }

  return `${formatDate(startDate)}-${formatDate(endDate)}`
}

export function formatWeekStartForExcel(weekKey: string): string {
  const startDate = new Date(weekKey) // 월요일
  return startDate.toLocaleDateString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  })
}
