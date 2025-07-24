// 엑셀 다운로드를 위한 유틸리티 함수들

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
  // CSV 형식으로 데이터 변환
  const csvContent = [
    data.headers.join(","),
    ...data.rows.map((row) =>
      row
        .map((cell) => {
          // 셀에 쉼표나 따옴표가 있으면 따옴표로 감싸기
          const cellStr = String(cell || "")
          if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        })
        .join(","),
    ),
  ].join("\n")

  // BOM 추가 (한글 깨짐 방지)
  const BOM = "\uFEFF"
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" })

  // 다운로드 링크 생성
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${data.filename}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// 간단한 Excel XML 생성 (더 안정적인 방식)
export function downloadMultiSheetExcel(data: MultiSheetExcelData) {
  console.log("🔧 Creating multi-sheet Excel with", data.sheets.length, "sheets")

  // 각 시트를 개별 CSV로 압축하여 다운로드하는 대신,
  // 안정적인 Excel XML 형식 사용
  let workbookXml = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>TTS 제품 발송 현황</Title>
  <Author>TTS System</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">
  <WindowHeight>12000</WindowHeight>
  <WindowWidth>16000</WindowWidth>
  <WindowTopX>240</WindowTopX>
  <WindowTopY>75</WindowTopY>
  <ProtectStructure>False</ProtectStructure>
  <ProtectWindows>False</ProtectWindows>
 </ExcelWorkbook>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="맑은 고딕" ss:Size="11"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4472C4" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Data">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="10"/>
  </Style>
  <Style ss:ID="Total">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2"/>
   </Borders>
   <Font ss:FontName="맑은 고딕" ss:Size="10" ss:Bold="1"/>
   <Interior ss:Color="#D9E1F2" ss:Pattern="Solid"/>
  </Style>
 </Styles>`

  // 각 시트 생성
  data.sheets.forEach((sheet, sheetIndex) => {
    console.log(`📋 Creating sheet: ${sheet.name} with ${sheet.rows.length} rows`)

    workbookXml += `
 <Worksheet ss:Name="${escapeXmlAttribute(sheet.name)}">
  <Table ss:ExpandedColumnCount="${sheet.headers.length}" ss:ExpandedRowCount="${sheet.rows.length + 1}" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="60" ss:DefaultRowHeight="15">`

    // 헤더 행
    workbookXml += `
   <Row ss:AutoFitHeight="0" ss:Height="20">`
    sheet.headers.forEach((header) => {
      workbookXml += `
    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXmlContent(String(header))}</Data></Cell>`
    })
    workbookXml += `
   </Row>`

    // 데이터 행들
    sheet.rows.forEach((row, rowIndex) => {
      const isLastRow = rowIndex === sheet.rows.length - 1
      const styleId = isLastRow ? "Total" : "Data"

      workbookXml += `
   <Row ss:AutoFitHeight="0">`
      row.forEach((cell, cellIndex) => {
        const cellValue = String(cell || "")
        const isNumeric = !isNaN(Number(cellValue)) && cellValue !== "" && cellIndex > 3 // 처음 4개 컬럼은 텍스트

        if (isNumeric && cellValue !== "0" && cellValue !== "-") {
          workbookXml += `
    <Cell ss:StyleID="${styleId}"><Data ss:Type="Number">${cellValue}</Data></Cell>`
        } else {
          workbookXml += `
    <Cell ss:StyleID="${styleId}"><Data ss:Type="String">${escapeXmlContent(cellValue)}</Data></Cell>`
        }
      })
      workbookXml += `
   </Row>`
    })

    workbookXml += `
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <PageSetup>
    <Header x:Margin="0.3"/>
    <Footer x:Margin="0.3"/>
    <PageMargins x:Bottom="0.75" x:Left="0.7" x:Right="0.7" x:Top="0.75"/>
   </PageSetup>
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>1</SplitHorizontal>
   <TopRowBottomPane>1</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane>
     <Number>3</Number>
    </Pane>
    <Pane>
     <Number>2</Number>
     <ActiveRow>0</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>`
  })

  workbookXml += `
</Workbook>`

  console.log("📁 Generated XML length:", workbookXml.length)

  // Excel 파일로 다운로드
  const blob = new Blob([workbookXml], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  })

  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${data.filename}.xls`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  console.log("✅ Excel file download initiated")
}

function escapeXmlContent(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // 제어 문자 제거
}

function escapeXmlAttribute(text: string): string {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // 제어 문자 제거
    .substring(0, 31) // Excel 시트명 길이 제한
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
