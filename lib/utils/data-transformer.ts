/**
 * 데이터 변환 유틸리티
 */

/**
 * 숫자 파싱 (통화 기호, 쉼표 제거)
 */
export function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0

  const str = value.toString().trim()
  if (str === '' || str === '\t') return 0

  const num = Number.parseFloat(str.replace(/[$,\s]/g, ''))
  return isNaN(num) ? 0 : num
}

/**
 * 정수 파싱
 */
export function parseInteger(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0

  const str = value.toString().trim()
  if (str === '' || str === '\t') return 0

  const num = Number.parseInt(str.replace(/[$,\s]/g, ''))
  return isNaN(num) ? 0 : num
}

/**
 * 퍼센트 파싱
 */
export function parsePercent(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0

  const str = value.toString().trim()
  const num = Number.parseFloat(str.replace(/[%,\s]/g, ''))
  return isNaN(num) ? 0 : num
}

/**
 * 날짜 파싱 (다양한 형식 지원)
 * MM/DD/YYYY HH:MM:SS AM/PM
 * YYYY-MM-DD
 * ISO 8601
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null

  try {
    // MM/DD/YYYY HH:MM:SS AM/PM 형식
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')
      const datePart = parts[0]
      const timePart = parts[1] || "00:00:00"
      const ampm = parts[2] || ""

      const [month, day, year] = datePart.split('/')

      if (timePart !== "00:00:00") {
        const [hours, minutes, seconds] = timePart.split(':')
        let hour = parseInt(hours)
        if (ampm === 'PM' && hour !== 12) hour += 12
        if (ampm === 'AM' && hour === 12) hour = 0

        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          hour,
          parseInt(minutes) || 0,
          parseInt(seconds) || 0
        )
      } else {
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 0, 0, 0)
      }
    }

    // ISO 형식 (2025-07-30T23:29:27.000Z)
    if (dateStr.includes('T')) {
      return new Date(dateStr)
    }

    // YYYY-MM-DD 형식
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00')
    }

    // 기타 형식 시도
    const date = new Date(dateStr)
    if (!isNaN(date.getTime())) {
      return date
    }

    return null
  } catch (e) {
    console.error('Date parsing error:', dateStr, e)
    return null
  }
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 날짜를 로컬 시간대 기준으로 파싱
 */
export function parseDateLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * 객체에서 필드 값 추출 (여러 가능한 키 이름 지원)
 */
export function getFieldValue(
  row: Record<string, any>,
  possibleKeys: string[]
): string {
  for (const key of possibleKeys) {
    if (row[key] !== undefined && row[key] !== null) {
      return String(row[key]).trim()
    }
  }
  return ""
}

/**
 * 문자열 길이 제한
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return ''
  return str.length > maxLength ? str.substring(0, maxLength) : str
}