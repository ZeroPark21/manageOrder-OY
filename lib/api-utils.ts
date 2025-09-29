import { NextRequest } from "next/server"

/**
 * Extract and validate company ID from request URL
 */
export function getCompanyIdFromRequest(request: NextRequest): number | null {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return null
  }

  const parsedId = parseInt(companyId, 10)

  if (isNaN(parsedId) || parsedId <= 0) {
    return null
  }

  return parsedId
}

/**
 * Add company_id filter to Supabase query builder
 */
export function addCompanyFilter(query: any, companyId: number | string) {
  return query.eq('company_id', companyId)
}