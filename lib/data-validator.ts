/**
 * Data validation utilities to ensure data integrity
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: {
    totalRecords: number
    uniqueCreators: number
    dateRange: {
      start: string | null
      end: string | null
    }
  }
}

/**
 * Validates contents data fetched from database
 */
export function validateContentsData(data: any[]): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check if data exists
  if (!data || !Array.isArray(data)) {
    errors.push("Data is not an array or is null")
    return {
      isValid: false,
      errors,
      warnings,
      metadata: {
        totalRecords: 0,
        uniqueCreators: 0,
        dateRange: { start: null, end: null }
      }
    }
  }
  
  // Count unique creators
  const creators = new Set<string>()
  let minDate: Date | null = null
  let maxDate: Date | null = null
  let invalidCreatorCount = 0
  let invalidDateCount = 0
  
  data.forEach((item, index) => {
    // Validate creator_name
    if (!item.creator_name || item.creator_name.trim() === '') {
      invalidCreatorCount++
    } else {
      creators.add(item.creator_name)
    }
    
    // Validate publish_date
    if (item.publish_date) {
      try {
        const date = new Date(item.publish_date)
        if (!isNaN(date.getTime())) {
          if (!minDate || date < minDate) minDate = date
          if (!maxDate || date > maxDate) maxDate = date
        } else {
          invalidDateCount++
        }
      } catch {
        invalidDateCount++
      }
    } else {
      invalidDateCount++
    }
    
    // Check for required fields
    if (!item.id) {
      warnings.push(`Record at index ${index} has no ID`)
    }
  })
  
  // Add warnings for invalid data
  if (invalidCreatorCount > 0) {
    warnings.push(`${invalidCreatorCount} records have invalid or missing creator_name`)
  }
  
  if (invalidDateCount > 0) {
    warnings.push(`${invalidDateCount} records have invalid or missing publish_date`)
  }
  
  // Check if we have the expected amount of data
  if (data.length < 1000 && data.length > 0) {
    warnings.push(`Only ${data.length} records fetched, which seems low. Expected more than 1000.`)
  }
  
  // Validate creator count
  const uniqueCreatorCount = creators.size
  if (uniqueCreatorCount < 400 && data.length > 1000) {
    warnings.push(`Only ${uniqueCreatorCount} unique creators found, expected around 445`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    metadata: {
      totalRecords: data.length,
      uniqueCreators: uniqueCreatorCount,
      dateRange: {
        start: minDate ? minDate.toISOString().split('T')[0] : null,
        end: maxDate ? maxDate.toISOString().split('T')[0] : null
      }
    }
  }
}

/**
 * Ensures all data is fetched from paginated API
 */
export async function fetchAllPaginatedData<T>(
  fetchFunction: (offset: number, limit: number) => Promise<{ data: T[], error: any }>,
  batchSize: number = 1000
): Promise<{ data: T[], error: any }> {
  const allData: T[] = []
  let offset = 0
  let hasMore = true
  let consecutiveEmptyBatches = 0
  const maxEmptyBatches = 2 // Stop after 2 consecutive empty batches
  
  while (hasMore) {
    try {
      const { data: batch, error } = await fetchFunction(offset, batchSize)
      
      if (error) {
        if (offset === 0) {
          // First batch error is critical
          return { data: [], error }
        }
        // Continue with partial data on subsequent batch errors
        console.warn(`Error fetching batch at offset ${offset}, continuing with partial data:`, error)
        break
      }
      
      if (batch && batch.length > 0) {
        allData.push(...batch)
        consecutiveEmptyBatches = 0
        
        console.log(`Fetched batch: ${batch.length} items (Total: ${allData.length})`)
        
        if (batch.length < batchSize) {
          // Last batch
          hasMore = false
        } else {
          offset += batchSize
        }
      } else {
        consecutiveEmptyBatches++
        if (consecutiveEmptyBatches >= maxEmptyBatches) {
          hasMore = false
        } else {
          offset += batchSize
        }
      }
      
      // Prevent infinite loops
      if (offset > 100000) {
        console.warn("Reached maximum offset limit, stopping pagination")
        hasMore = false
      }
    } catch (error) {
      console.error(`Exception while fetching batch at offset ${offset}:`, error)
      if (offset === 0) {
        return { data: [], error }
      }
      break
    }
  }
  
  console.log(`✅ Total fetched: ${allData.length} records`)
  return { data: allData, error: null }
}

/**
 * Get expected creator count based on current date
 * This helps detect if data is incomplete
 */
export function getExpectedCreatorCount(): number {
  // As of the check, we know there should be 445 creators
  // This can be updated periodically or fetched from a config
  return 445
}

/**
 * Verify data consistency across different APIs
 */
export async function verifyDataConsistency(
  endpoint1: string,
  endpoint2: string
): Promise<{ isConsistent: boolean, differences: string[] }> {
  const differences: string[] = []
  
  try {
    const [response1, response2] = await Promise.all([
      fetch(endpoint1),
      fetch(endpoint2)
    ])
    
    const data1 = await response1.json()
    const data2 = await response2.json()
    
    // Compare unique creators
    if (data1.uniqueCreators !== data2.uniqueCreators) {
      differences.push(
        `Creator count mismatch: ${endpoint1}=${data1.uniqueCreators}, ${endpoint2}=${data2.uniqueCreators}`
      )
    }
    
    // Compare total counts
    if (data1.totalContents !== data2.totalContents) {
      differences.push(
        `Content count mismatch: ${endpoint1}=${data1.totalContents}, ${endpoint2}=${data2.totalContents}`
      )
    }
    
    return {
      isConsistent: differences.length === 0,
      differences
    }
  } catch (error) {
    console.error("Error verifying data consistency:", error)
    return {
      isConsistent: false,
      differences: [`Error during verification: ${error}`]
    }
  }
}