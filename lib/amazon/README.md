# Amazon SP-API 통합

이 디렉토리는 Amazon SP-API를 통해 주문 데이터를 가져와 DB 스키마로 변환하는 유틸리티를 포함합니다.

## 파일 구조

- `sp-api-mapper.ts` - SP-API 응답을 DB 스키마로 변환하는 매퍼
- `sp-api-client.ts` - SP-API 호출 및 데이터 통합 클라이언트
- `README.md` - 이 파일

## 왜 필요한가?

Amazon SP-API는 주문 정보가 두 개의 엔드포인트로 나뉘어져 있습니다:

1. **getOrders** - 주문 기본 정보, 배송지, 구매자 정보
2. **getOrderItems** - 상품 정보 (ASIN, SKU, 가격, 수량)

반면 현재 CSV 업로드 방식은 Amazon Seller Central의 Order Report를 사용하며, 모든 정보가 하나의 파일에 있습니다.

이 라이브러리는 두 API를 조합하여 CSV와 동일한 형태의 데이터를 생성합니다.

## 사용 방법

### 1. 기본 사용

```typescript
import { fetchAndMapOrders } from '@/lib/amazon/sp-api-client'
import { createClient } from '@supabase/supabase-js'

const config = {
  region: 'na', // North America
  marketplaceId: 'ATVPDKIKX0DER', // US
  accessToken: 'your-lwa-access-token',
}

const companyId = 1002

// 최근 30일 주문 가져오기
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

const result = await fetchAndMapOrders(config, companyId, {
  CreatedAfter: thirtyDaysAgo.toISOString(),
})

console.log(`✅ Fetched ${result.totalOrders} orders with ${result.totalItems} items`)
console.log(`❌ ${result.errors.length} errors`)

// DB에 저장
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { error } = await supabase
  .from('amazon_orders')
  .upsert(result.records, {
    onConflict: 'company_id,order_item_id',
  })

if (error) {
  console.error('DB insert error:', error)
} else {
  console.log(`✅ Saved ${result.records.length} records to DB`)
}
```

### 2. 특정 상태의 주문만 가져오기

```typescript
const result = await fetchAndMapOrders(config, companyId, {
  CreatedAfter: thirtyDaysAgo.toISOString(),
  OrderStatuses: ['Unshipped', 'PartiallyShipped'], // 미출고/부분출고만
})
```

### 3. 액세스 토큰 갱신

```typescript
import { refreshAccessToken } from '@/lib/amazon/sp-api-client'

const { accessToken, expiresIn } = await refreshAccessToken(
  'your-refresh-token',
  'your-client-id',
  'your-client-secret'
)

console.log(`New access token: ${accessToken}`)
console.log(`Expires in: ${expiresIn} seconds`)
```

## API 엔드포인트 사용 예시

### API Route 예시: `/api/amazon/sync-orders`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchAndMapOrders } from '@/lib/amazon/sp-api-client'

export async function POST(req: NextRequest) {
  const { companyId, daysBack = 30 } = await req.json()

  // 회사의 Amazon API 설정 가져오기
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: company } = await supabase
    .from('companies')
    .select('amazon_api_config')
    .eq('id', companyId)
    .single()

  if (!company?.amazon_api_config) {
    return NextResponse.json(
      { error: 'Amazon API not configured' },
      { status: 400 }
    )
  }

  const config = {
    region: company.amazon_api_config.region || 'na',
    marketplaceId: company.amazon_api_config.marketplaceId,
    accessToken: company.amazon_api_config.accessToken,
  }

  const daysAgo = new Date()
  daysAgo.setDate(daysAgo.getDate() - daysBack)

  try {
    const result = await fetchAndMapOrders(config, companyId, {
      CreatedAfter: daysAgo.toISOString(),
    })

    // DB에 저장
    const { error } = await supabase
      .from('amazon_orders')
      .upsert(result.records, {
        onConflict: 'company_id,order_item_id',
      })

    if (error) throw error

    // channel_settings 업데이트
    await supabase
      .from('companies')
      .update({
        channel_settings: supabase.raw(`
          jsonb_set(
            COALESCE(channel_settings, '{}'::jsonb),
            '{amazon}',
            jsonb_build_object(
              'sync_type', 'api',
              'last_sync', NOW()
            )
          )
        `)
      })
      .eq('id', companyId)

    return NextResponse.json({
      success: true,
      totalOrders: result.totalOrders,
      totalItems: result.totalItems,
      recordsSaved: result.records.length,
      errors: result.errors,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    )
  }
}
```

## DB 스키마 매핑

| SP-API 필드 | DB 필드 | 출처 |
|-------------|---------|------|
| AmazonOrderId | order_id | getOrders |
| OrderItemId | order_item_id | getOrderItems |
| PurchaseDate | purchase_date | getOrders |
| - | payments_date | ❌ SP-API에 없음 |
| EarliestShipDate | earliest_ship_date | getOrders |
| LatestShipDate | latest_ship_date | getOrders |
| BuyerInfo.BuyerEmail | buyer_email | getOrders |
| BuyerInfo.BuyerName | buyer_name | getOrders |
| - | buyer_phone_number | ❌ SP-API에 없음 |
| SellerSKU | sku | getOrderItems |
| Title | product_name | getOrderItems |
| ASIN | asin | getOrderItems |
| QuantityOrdered | quantity_purchased | getOrderItems |
| ItemPrice.Amount | item_price | getOrderItems |
| ItemTax.Amount | item_tax | getOrderItems |
| ShippingPrice.Amount | shipping_price | getOrderItems |
| ShippingTax.Amount | shipping_tax | getOrderItems |
| ShipmentServiceLevelCategory | ship_service_level | getOrders |
| ShippingAddress.Name | recipient_name | getOrders |
| ShippingAddress.AddressLine1 | ship_address_1 | getOrders |
| ShippingAddress.City | ship_city | getOrders |
| ShippingAddress.StateOrRegion | ship_state | getOrders |
| PromotionDiscount.Amount | item_promotion_discount | getOrderItems |
| ShippingDiscount.Amount | ship_promotion_discount | getOrderItems |
| OrderStatus | item_status | getOrders |
| FulfillmentChannel | fulfillment_channel | getOrders |
| IsBusinessOrder | is_business_order | getOrders |
| IsPrime | is_prime | getOrders |
| IsPremiumOrder | is_premium_order | getOrders |
| PriceDesignation | price_designation | getOrderItems |

## 주의사항

### Rate Limiting
- getOrders: 초당 0.0167 requests (분당 1회)
- getOrderItems: 초당 0.5 requests (분당 30회)

이 라이브러리는 자동으로 rate limiting을 처리합니다 (각 요청 후 1초 대기).

### 비용
SP-API 호출은 무료이지만, quota 제한이 있습니다. 대량의 주문을 자주 동기화하면 제한에 걸릴 수 있습니다.

### 누락된 필드
- `payments_date` - SP-API에 없음
- `buyer_phone_number` - SP-API에 없음 (PII 제한)
- `sales_channel` - SP-API에 명시적으로 없음

## 다음 단계

1. `companies` 테이블에 `amazon_api_config` JSONB 필드 추가
2. Amazon API 설정 UI 구현 (`/dashboard/[companyId]/amazon/settings`)
3. 자동 동기화 스케줄러 구현 (cron job)
4. 동기화 히스토리 추적 테이블 추가

## 참고 문서

- [Amazon SP-API Orders API Reference](https://developer-docs.amazon.com/sp-api/docs/orders-api-v0-reference)
- [LWA (Login with Amazon) Documentation](https://developer.amazon.com/docs/login-with-amazon/authorization-code-grant.html)
