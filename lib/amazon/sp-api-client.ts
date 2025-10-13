/**
 * Amazon SP-API 클라이언트
 *
 * getOrders와 getOrderItems를 조합하여 주문 데이터를 가져옴
 */

import { SPApiOrder, SPApiOrderItem, mapMultipleSPApiOrders, AmazonOrderDB } from './sp-api-mapper'

// SP-API 설정 타입
export interface SPApiConfig {
  region: 'na' | 'eu' | 'fe' // North America, Europe, Far East
  marketplaceId: string // 예: ATVPDKIKX0DER (US)
  accessToken: string // LWA access token
  refreshToken?: string
  clientId?: string
  clientSecret?: string
}

// API 응답 타입
interface GetOrdersResponse {
  payload: {
    Orders: SPApiOrder[]
    NextToken?: string
  }
}

interface GetOrderItemsResponse {
  payload: {
    AmazonOrderId: string
    OrderItems: SPApiOrderItem[]
    NextToken?: string
  }
}

/**
 * SP-API 엔드포인트 URL 생성
 */
function getEndpointUrl(region: 'na' | 'eu' | 'fe'): string {
  const endpoints = {
    na: 'https://sellingpartnerapi-na.amazon.com',
    eu: 'https://sellingpartnerapi-eu.amazon.com',
    fe: 'https://sellingpartnerapi-fe.amazon.com',
  }
  return endpoints[region]
}

/**
 * getOrders API 호출
 *
 * @param config - SP-API 설정
 * @param params - 쿼리 파라미터 (CreatedAfter, CreatedBefore 등)
 * @returns 주문 목록
 */
export async function getOrders(
  config: SPApiConfig,
  params: {
    CreatedAfter?: string // ISO 8601 format
    CreatedBefore?: string
    LastUpdatedAfter?: string
    LastUpdatedBefore?: string
    OrderStatuses?: string[] // ['Pending', 'Unshipped', 'Shipped', ...]
    MarketplaceIds?: string[]
    FulfillmentChannels?: string[] // ['MFN', 'AFN']
    MaxResultsPerPage?: number // 1-100, default 100
    NextToken?: string
  } = {}
): Promise<{ orders: SPApiOrder[]; nextToken?: string }> {
  const endpoint = getEndpointUrl(config.region)
  const url = new URL(`${endpoint}/orders/v0/orders`)

  // 쿼리 파라미터 추가
  if (params.CreatedAfter) url.searchParams.set('CreatedAfter', params.CreatedAfter)
  if (params.CreatedBefore) url.searchParams.set('CreatedBefore', params.CreatedBefore)
  if (params.LastUpdatedAfter) url.searchParams.set('LastUpdatedAfter', params.LastUpdatedAfter)
  if (params.LastUpdatedBefore) url.searchParams.set('LastUpdatedBefore', params.LastUpdatedBefore)
  if (params.OrderStatuses) {
    params.OrderStatuses.forEach(status => url.searchParams.append('OrderStatuses', status))
  }
  if (params.MarketplaceIds) {
    params.MarketplaceIds.forEach(id => url.searchParams.append('MarketplaceIds', id))
  } else {
    // 기본값: 설정된 마켓플레이스
    url.searchParams.set('MarketplaceIds', config.marketplaceId)
  }
  if (params.FulfillmentChannels) {
    params.FulfillmentChannels.forEach(ch => url.searchParams.append('FulfillmentChannels', ch))
  }
  if (params.MaxResultsPerPage) {
    url.searchParams.set('MaxResultsPerPage', params.MaxResultsPerPage.toString())
  }
  if (params.NextToken) {
    url.searchParams.set('NextToken', params.NextToken)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-amz-access-token': config.accessToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`getOrders failed: ${response.status} ${error}`)
  }

  const data: GetOrdersResponse = await response.json()
  return {
    orders: data.payload.Orders || [],
    nextToken: data.payload.NextToken,
  }
}

/**
 * getOrderItems API 호출
 *
 * @param config - SP-API 설정
 * @param orderId - Amazon Order ID
 * @param nextToken - 페이지네이션 토큰
 * @returns 주문 아이템 목록
 */
export async function getOrderItems(
  config: SPApiConfig,
  orderId: string,
  nextToken?: string
): Promise<{ orderItems: SPApiOrderItem[]; nextToken?: string }> {
  const endpoint = getEndpointUrl(config.region)
  const url = new URL(`${endpoint}/orders/v0/orders/${orderId}/orderItems`)

  if (nextToken) {
    url.searchParams.set('NextToken', nextToken)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'accept': 'application/json',
      'x-amz-access-token': config.accessToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`getOrderItems failed for order ${orderId}: ${response.status} ${error}`)
  }

  const data: GetOrderItemsResponse = await response.json()
  return {
    orderItems: data.payload.OrderItems || [],
    nextToken: data.payload.NextToken,
  }
}

/**
 * 모든 주문 아이템을 페이지네이션하여 가져오기
 */
async function getAllOrderItems(
  config: SPApiConfig,
  orderId: string
): Promise<SPApiOrderItem[]> {
  const allItems: SPApiOrderItem[] = []
  let nextToken: string | undefined

  do {
    const result = await getOrderItems(config, orderId, nextToken)
    allItems.push(...result.orderItems)
    nextToken = result.nextToken

    // Rate limiting: 1 request per second
    if (nextToken) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } while (nextToken)

  return allItems
}

/**
 * 주문과 주문 아이템을 모두 가져와서 DB 스키마로 변환
 *
 * @param config - SP-API 설정
 * @param companyId - 회사 ID
 * @param params - getOrders 파라미터
 * @returns DB에 저장할 주문 레코드 배열
 */
export async function fetchAndMapOrders(
  config: SPApiConfig,
  companyId: number,
  params: {
    CreatedAfter?: string
    CreatedBefore?: string
    LastUpdatedAfter?: string
    LastUpdatedBefore?: string
    OrderStatuses?: string[]
  } = {}
): Promise<{
  records: AmazonOrderDB[]
  totalOrders: number
  totalItems: number
  errors: Array<{ orderId: string; error: string }>
}> {
  const allOrders: SPApiOrder[] = []
  const orderItemsMap = new Map<string, SPApiOrderItem[]>()
  const errors: Array<{ orderId: string; error: string }> = []

  // 1. 모든 주문 가져오기 (페이지네이션)
  let nextToken: string | undefined
  do {
    const result = await getOrders(config, { ...params, NextToken: nextToken })
    allOrders.push(...result.orders)
    nextToken = result.nextToken

    // Rate limiting
    if (nextToken) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  } while (nextToken)

  console.log(`✅ Fetched ${allOrders.length} orders from SP-API`)

  // 2. 각 주문의 아이템 가져오기
  for (let i = 0; i < allOrders.length; i++) {
    const order = allOrders[i]
    try {
      const items = await getAllOrderItems(config, order.AmazonOrderId)
      orderItemsMap.set(order.AmazonOrderId, items)
      console.log(`✅ [${i + 1}/${allOrders.length}] Fetched ${items.length} items for order ${order.AmazonOrderId}`)

      // Rate limiting: 1 request per second
      if (i < allOrders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`❌ Failed to fetch items for order ${order.AmazonOrderId}:`, errorMessage)
      errors.push({ orderId: order.AmazonOrderId, error: errorMessage })
    }
  }

  // 3. DB 스키마로 변환
  const records = mapMultipleSPApiOrders(allOrders, orderItemsMap, companyId)

  const totalItems = Array.from(orderItemsMap.values()).reduce((sum, items) => sum + items.length, 0)

  return {
    records,
    totalOrders: allOrders.length,
    totalItems,
    errors,
  }
}

/**
 * LWA (Login with Amazon) 액세스 토큰 갱신
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh access token: ${response.status} ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in, // seconds
  }
}
