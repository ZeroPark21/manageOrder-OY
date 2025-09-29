/**
 * 배치 처리 유틸리티
 */

import { createServerClient } from "@/lib/database/supabase"

export interface BatchProcessOptions {
  batchSize?: number
  maxRetries?: number
  onProgress?: (processed: number, total: number) => void
  onError?: (error: any, batch: any[]) => void
}

/**
 * 데이터를 배치로 나누어 처리
 */
export async function processBatches<T, R>(
  data: T[],
  processor: (batch: T[]) => Promise<R>,
  options: BatchProcessOptions = {}
): Promise<R[]> {
  const {
    batchSize = 500, // 기본값을 50에서 500으로 증가
    maxRetries = 3,
    onProgress,
    onError
  } = options

  const results: R[] = []
  let processedCount = 0

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    let retries = 0
    let success = false

    while (retries < maxRetries && !success) {
      try {
        const result = await processor(batch)
        results.push(result)
        success = true

        processedCount += batch.length
        if (onProgress) {
          onProgress(processedCount, data.length)
        }
      } catch (error) {
        retries++
        if (retries >= maxRetries) {
          if (onError) {
            onError(error, batch)
          }
          console.error(`Batch processing failed after ${maxRetries} retries:`, error)
        } else {
          // 재시도 전 대기 (지수 백오프)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)))
        }
      }
    }
  }

  return results
}

/**
 * 병렬 배치 처리
 */
export async function processParallelBatches<T, R>(
  data: T[],
  processor: (batch: T[]) => Promise<R>,
  options: BatchProcessOptions & { maxConcurrent?: number } = {}
): Promise<R[]> {
  const {
    batchSize = 500,
    maxConcurrent = 4,
    onProgress,
    onError
  } = options

  const batches: T[][] = []
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize))
  }

  const results: R[] = []
  let processedBatches = 0

  for (let i = 0; i < batches.length; i += maxConcurrent) {
    const concurrentBatches = batches.slice(i, i + maxConcurrent)

    const batchPromises = concurrentBatches.map(batch =>
      processor(batch).catch(error => {
        if (onError) onError(error, batch)
        return null
      })
    )

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults.filter(r => r !== null) as R[])

    processedBatches += concurrentBatches.length
    if (onProgress) {
      onProgress(
        Math.min(processedBatches * batchSize, data.length),
        data.length
      )
    }
  }

  return results
}

/**
 * UPSERT 배치 처리 헬퍼
 */
export interface UpsertOptions<T> {
  tableName: string
  uniqueKey: keyof T
  companyIdField?: keyof T
  companyId?: string
}

export async function batchUpsert<T extends Record<string, any>>(
  data: T[],
  options: UpsertOptions<T>
): Promise<{ inserted: number; updated: number; failed: number }> {
  const { tableName, uniqueKey, companyIdField, companyId } = options
  const supabase = createServerClient()

  let inserted = 0
  let updated = 0
  let failed = 0

  // 기존 데이터 조회
  const uniqueValues = data.map(item => item[uniqueKey])

  let query = supabase
    .from(tableName)
    .select(`id, ${String(uniqueKey)}`)
    .in(String(uniqueKey), uniqueValues)

  if (companyIdField && companyId) {
    query = query.eq(String(companyIdField), companyId)
  }

  const { data: existingRecords, error: selectError } = await query

  if (selectError) {
    console.error('Error fetching existing records:', selectError)
    throw selectError
  }

  // 기존 레코드 맵 생성
  const existingMap = new Map(
    existingRecords?.map(record => [
      String(record[uniqueKey as keyof typeof record]),
      (record as any).id
    ]) || []
  )

  // 데이터 분류
  const toInsert: T[] = []
  const toUpdate: T[] = []

  data.forEach(item => {
    const key = String(item[uniqueKey])
    if (existingMap.has(key)) {
      toUpdate.push({ ...item, id: existingMap.get(key) })
    } else {
      toInsert.push(item)
    }
  })

  // 배치 삽입
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(toInsert)

    if (insertError) {
      console.error('Batch insert error:', insertError)
      failed += toInsert.length
    } else {
      inserted = toInsert.length
    }
  }

  // 배치 업데이트
  if (toUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from(tableName)
      .upsert(toUpdate)

    if (updateError) {
      console.error('Batch update error:', updateError)
      failed += toUpdate.length
    } else {
      updated = toUpdate.length
    }
  }

  return { inserted, updated, failed }
}