/**
 * 데이터베이스 타입 정의
 */

// Orders 테이블
export interface Order {
  id?: number
  order_id: string
  company_id: string
  order_status?: string | null
  order_substatus?: string | null
  cancelation_return_type?: string | null
  normal_or_preorder?: string | null
  sku_id?: string | null
  seller_sku?: string | null
  product_name: string
  variation?: string | null
  quantity: number
  sku_quantity_of_return?: number
  sku_unit_original_price?: number
  sku_subtotal_before_discount?: number
  sku_platform_discount?: number
  sku_seller_discount?: number
  sku_subtotal_after_discount?: number
  shipping_fee_after_discount?: number
  original_shipping_fee?: number
  shipping_fee_seller_discount?: number
  co_funded_shipping_fee_discount?: number
  shipping_fee_platform_discount?: number
  payment_platform_discount?: number
  retail_delivery_fee?: number
  taxes?: number
  order_amount?: number
  order_refund_amount?: number
  created_time?: string | null
  paid_time?: string | null
  rts_time?: string | null
  shipped_time?: string | null
  delivered_time?: string | null
  cancelled_time?: string | null
  cancel_by?: string | null
  cancel_reason?: string | null
  fulfillment_type?: string | null
  warehouse_name?: string | null
  tracking_id?: string | null
  delivery_option_type?: string | null
  delivery_option?: string | null
  shipping_provider_name?: string | null
  buyer_message?: string | null
  buyer_username?: string | null
  recipient?: string | null
  phone_number?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  zipcode?: string | null
  address_line_1?: string | null
  address_line_2?: string | null
  delivery_instruction?: string | null
  payment_method?: string | null
  weight_kg?: number
  product_category?: string | null
  package_id?: string | null
  seller_note?: string | null
  shipping_information?: string | null
  combined_listing?: string | null
  created_at?: string
  updated_at?: string
}

// Contents 테이블
export interface Content {
  id?: number
  content_title: string
  video_link: string
  publish_date: string
  creator_name: string
  company_id: string
  gmv: number
  affiliate_items_sold: number
  affiliate_gmv: number
  shoppable_avg_order_value: number
  est_commission: number
  est_flat_fee: string
  affiliate_orders: number
  shoppable_impressions: number
  affiliate_ctr: number
  shoppable_gpm: number
  affiliate_items_refunded: number
  affiliate_refunded_gmv: number
  comment_count: number
  like_count: number
  created_at?: string
  updated_at?: string
}

// Companies 테이블
export interface Company {
  id: number
  name: string
  created_at?: string
  updated_at?: string
}

// Users 테이블
export interface User {
  id: string
  email: string
  created_at?: string
  updated_at?: string
}

// UserCompanies 테이블
export interface UserCompany {
  id?: number
  user_id: string
  company_id: number
  role: "viewer" | "editor" | "admin"
  created_at?: string
  updated_at?: string
}

// Sales 분석용 타입
export interface SalesOrder {
  id: number
  product_name: string
  quantity: number
  created_time: string
  order_amount: number
  sku_unit_original_price: number
  seller_sku: string
  sku_id: string
  company_id?: number
}

export interface ProductSalesData {
  [date: string]: {
    quantity: number
    revenue: number
  }
  total: {
    quantity: number
    revenue: number
  }
}