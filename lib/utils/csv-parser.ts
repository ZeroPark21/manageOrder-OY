/**
 * CSV 파싱 유틸리티
 */

/**
 * CSV 라인을 파싱하는 함수
 * 큰따옴표로 묶인 필드와 이스케이프된 따옴표를 올바르게 처리
 */
export function parseCSVLine(line: string): string[] {
  const result: string[] = []
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
  return result.map(cell => cell.replace(/^"|"$/g, ''))
}

/**
 * CSV 텍스트를 파싱하여 객체 배열로 변환
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0])
  const data: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length !== headers.length) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })
    data.push(row)
  }

  return data
}

/**
 * Excel 파일 시그니처 확인
 */
export function isExcelFile(buffer: ArrayBuffer, fileName: string = ''): boolean {
  const uint8Array = new Uint8Array(buffer.slice(0, 8))

  // Excel 파일 시그니처 확인
  const isPkZip = uint8Array[0] === 0x50 && uint8Array[1] === 0x4B // PK (ZIP based Excel)
  const isOleCompound = uint8Array[0] === 0xD0 && uint8Array[1] === 0xCF // Old Excel format

  return isPkZip || isOleCompound ||
         fileName.endsWith('.xlsx') ||
         fileName.endsWith('.xls')
}