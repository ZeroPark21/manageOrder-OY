/**
 * 에러 처리 유틸리티
 */

export interface APIError {
  error: string
  details?: string
  code?: string
  status?: number
}

/**
 * 에러 응답 생성 헬퍼
 */
export function createErrorResponse(
  error: unknown,
  defaultMessage: string = "An error occurred",
  status: number = 500
): APIError {
  if (error instanceof Error) {
    // Supabase 에러 처리
    if (error.message.includes("duplicate key") || error.message.includes("unique constraint")) {
      return {
        error: "중복된 데이터가 있습니다",
        details: error.message,
        code: "DUPLICATE_ERROR",
        status: 400
      }
    }

    if (error.message.includes("invalid input syntax")) {
      return {
        error: "잘못된 데이터 형식입니다",
        details: error.message,
        code: "VALIDATION_ERROR",
        status: 400
      }
    }

    if (error.message.includes("violates foreign key constraint")) {
      return {
        error: "참조 무결성 오류가 발생했습니다",
        details: error.message,
        code: "FOREIGN_KEY_ERROR",
        status: 400
      }
    }

    return {
      error: error.message || defaultMessage,
      details: error.stack,
      status
    }
  }

  if (typeof error === "string") {
    return {
      error,
      status
    }
  }

  return {
    error: defaultMessage,
    details: JSON.stringify(error),
    status
  }
}

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("econnrefused") ||
      message.includes("socket hang up") ||
      message.includes("429") // Rate limit
    )
  }
  return false
}

/**
 * 지수 백오프로 재시도
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!isRetryableError(error) || i === maxRetries - 1) {
        throw error
      }

      const delay = initialDelay * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * 에러 로깅 (프로덕션/개발 환경 구분)
 */
export function logError(context: string, error: unknown): void {
  const isDevelopment = process.env.NODE_ENV === "development"

  if (isDevelopment) {
    console.error(`[${context}] Error:`, error)
    if (error instanceof Error) {
      console.error(`[${context}] Stack:`, error.stack)
    }
  } else {
    // 프로덕션에서는 구조화된 로깅
    const errorInfo = {
      context,
      message: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
      ...(error instanceof Error && { stack: error.stack })
    }
    console.error(JSON.stringify(errorInfo))
  }
}