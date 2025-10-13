/**
 * Amazon SP-API 데이터를 DB 스키마로 변환하는 매퍼
 *
 * SP-API는 두 개의 엔드포인트를 조합해야 함:
 * 1. getOrders - 주문 기본 정보, 배송지, 구매자 정보
 * 2. getOrderItems - 상품 정보 (ASIN, SKU, 가격, 수량)
 */

// SP-API 타입 정의
export interface SPApiOrder {
  AmazonOrderId: string;
  PurchaseDate: string;
  LastUpdateDate: string;
  OrderStatus: string;
  FulfillmentChannel: string;
  NumberOfItemsShipped: number;
  NumberOfItemsUnshipped: number;
  PaymentMethod?: string;
  PaymentMethodDetails?: string[];
  MarketplaceId: string;
  ShipmentServiceLevelCategory: string;
  OrderType: string;
  EarliestShipDate?: string;
  LatestShipDate?: string;
  EarliestDeliveryDate?: string;
  LatestDeliveryDate?: string;
  IsBusinessOrder: boolean;
  IsPrime: boolean;
  IsAccessPointOrder: boolean;
  IsGlobalExpressEnabled: boolean;
  IsPremiumOrder: boolean;
  IsSoldByAB: boolean;
  IsIBA: boolean;
  ShippingAddress?: {
    Name?: string;
    AddressLine1?: string;
    AddressLine2?: string;
    AddressLine3?: string;
    City?: string;
    StateOrRegion?: string;
    PostalCode?: string;
    CountryCode?: string;
  };
  BuyerInfo?: {
    BuyerEmail?: string;
    BuyerName?: string;
    BuyerTaxInfo?: {
      CompanyLegalName?: string;
    };
    PurchaseOrderNumber?: string;
  };
}

export interface SPApiOrderItem {
  ASIN: string;
  OrderItemId: string;
  SellerSKU: string;
  Title: string;
  QuantityOrdered: number;
  QuantityShipped?: number;
  ItemPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  ItemTax?: {
    CurrencyCode: string;
    Amount: string;
  };
  ShippingPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  ShippingTax?: {
    CurrencyCode: string;
    Amount: string;
  };
  GiftWrapPrice?: {
    CurrencyCode: string;
    Amount: string;
  };
  GiftWrapTax?: {
    CurrencyCode: string;
    Amount: string;
  };
  PromotionDiscount?: {
    CurrencyCode: string;
    Amount: string;
  };
  ShippingDiscount?: {
    CurrencyCode: string;
    Amount: string;
  };
  PromotionIds?: string[];
  ConditionId?: string;
  ConditionSubtypeId?: string;
  ConditionNote?: string;
  PriceDesignation?: string;
  BuyerInfo?: {
    BuyerCustomizedInfo?: {
      CustomizedURL?: string;
    };
    GiftMessageText?: string;
    GiftWrapPrice?: {
      CurrencyCode: string;
      Amount: string;
    };
    GiftWrapLevel?: string;
  };
  BuyerRequestedCancel?: {
    IsBuyerRequestedCancel?: string;
    BuyerCancelReason?: string;
  };
  SerialNumbers?: string[];
}

// DB 스키마 타입
export interface AmazonOrderDB {
  company_id: number;
  order_id: string;
  order_item_id: string;
  purchase_date: string;
  payments_date?: string | null;
  ship_date?: string | null;
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone_number?: string;
  sku: string;
  product_name: string;
  asin: string;
  quantity_purchased: number;
  currency: string;
  item_price: number;
  item_tax: number;
  shipping_price: number;
  shipping_tax: number;
  gift_wrap_price: number;
  gift_wrap_tax: number;
  ship_service_level: string;
  recipient_name?: string;
  ship_address_1?: string;
  ship_address_2?: string;
  ship_address_3?: string;
  ship_city?: string;
  ship_state?: string;
  ship_postal_code?: string;
  ship_country?: string;
  item_promotion_discount: number;
  ship_promotion_discount: number;
  item_status: string;
  fulfillment_channel: string;
  sales_channel: string;
  order_channel: string;
  is_business_order: boolean;
  is_prime: boolean;
  is_premium_order: boolean;
  price_designation?: string;
  earliest_ship_date?: string | null;
  latest_ship_date?: string | null;
  earliest_delivery_date?: string | null;
  latest_delivery_date?: string | null;
}

/**
 * SP-API Money 객체를 숫자로 변환
 */
function parseAmount(money?: { CurrencyCode: string; Amount: string }): number {
  if (!money || !money.Amount) return 0;
  return parseFloat(money.Amount) || 0;
}

/**
 * ISO 8601 날짜를 PostgreSQL TIMESTAMP로 변환
 */
function parseDate(isoDate?: string): string | null {
  if (!isoDate) return null;
  try {
    return new Date(isoDate).toISOString();
  } catch {
    return null;
  }
}

/**
 * SP-API의 getOrders + getOrderItems 응답을 DB 레코드로 변환
 *
 * @param order - getOrders API 응답의 단일 주문
 * @param orderItems - getOrderItems API 응답의 아이템 배열
 * @param companyId - 회사 ID
 * @returns DB에 저장할 주문 레코드 배열 (각 아이템마다 1개의 레코드)
 */
export function mapSPApiToDBSchema(
  order: SPApiOrder,
  orderItems: SPApiOrderItem[],
  companyId: number
): AmazonOrderDB[] {
  const dbRecords: AmazonOrderDB[] = [];

  // 각 OrderItem을 별도의 DB 레코드로 변환
  for (const item of orderItems) {
    // 프로모션 할인 합계 계산
    const itemPromotionDiscount = parseAmount(item.PromotionDiscount);
    const shipPromotionDiscount = parseAmount(item.ShippingDiscount);

    const dbRecord: AmazonOrderDB = {
      company_id: companyId,

      // 주문 정보 (getOrders에서)
      order_id: order.AmazonOrderId,
      order_item_id: item.OrderItemId,
      purchase_date: parseDate(order.PurchaseDate) || "",
      payments_date: null, // SP-API에는 없음
      ship_date: null, // SP-API에는 없음 (EarliestShipDate/LatestShipDate만 있음)

      // 구매자 정보 (getOrders에서)
      buyer_email: order.BuyerInfo?.BuyerEmail || "",
      buyer_name: order.BuyerInfo?.BuyerName || "",
      buyer_phone_number: "", // SP-API에는 없음

      // 상품 정보 (getOrderItems에서)
      sku: item.SellerSKU,
      product_name: item.Title,
      asin: item.ASIN,
      quantity_purchased: item.QuantityOrdered,

      // 가격 정보 (getOrderItems에서)
      currency: item.ItemPrice?.CurrencyCode || "USD",
      item_price: parseAmount(item.ItemPrice),
      item_tax: parseAmount(item.ItemTax),
      shipping_price: parseAmount(item.ShippingPrice),
      shipping_tax: parseAmount(item.ShippingTax),
      gift_wrap_price: parseAmount(item.BuyerInfo?.GiftWrapPrice),
      gift_wrap_tax: parseAmount(item.GiftWrapTax),

      // 배송 정보 (getOrders에서)
      ship_service_level: order.ShipmentServiceLevelCategory || "",
      recipient_name: order.ShippingAddress?.Name || "",
      ship_address_1: order.ShippingAddress?.AddressLine1 || "",
      ship_address_2: order.ShippingAddress?.AddressLine2 || "",
      ship_address_3: order.ShippingAddress?.AddressLine3 || "",
      ship_city: order.ShippingAddress?.City || "",
      ship_state: order.ShippingAddress?.StateOrRegion || "",
      ship_postal_code: order.ShippingAddress?.PostalCode || "",
      ship_country: order.ShippingAddress?.CountryCode || "",

      // 할인 정보
      item_promotion_discount: itemPromotionDiscount,
      ship_promotion_discount: shipPromotionDiscount,

      // 상태 정보
      item_status: order.OrderStatus,
      fulfillment_channel: order.FulfillmentChannel,
      sales_channel: "", // SP-API에는 없음
      order_channel: order.OrderType || "",

      // 비즈니스 정보
      is_business_order: order.IsBusinessOrder,
      is_prime: order.IsPrime,
      is_premium_order: order.IsPremiumOrder,

      // 기타
      price_designation: item.PriceDesignation || "",

      // 배송 날짜 범위
      earliest_ship_date: parseDate(order.EarliestShipDate),
      latest_ship_date: parseDate(order.LatestShipDate),
      earliest_delivery_date: parseDate(order.EarliestDeliveryDate),
      latest_delivery_date: parseDate(order.LatestDeliveryDate),
    };

    dbRecords.push(dbRecord);
  }

  return dbRecords;
}

/**
 * 여러 주문을 일괄 변환
 */
export function mapMultipleSPApiOrders(
  orders: SPApiOrder[],
  orderItemsMap: Map<string, SPApiOrderItem[]>,
  companyId: number
): AmazonOrderDB[] {
  const allRecords: AmazonOrderDB[] = [];

  for (const order of orders) {
    const orderItems = orderItemsMap.get(order.AmazonOrderId) || [];
    if (orderItems.length === 0) {
      console.warn(`No order items found for order ${order.AmazonOrderId}`);
      continue;
    }

    const records = mapSPApiToDBSchema(order, orderItems, companyId);
    allRecords.push(...records);
  }

  return allRecords;
}
