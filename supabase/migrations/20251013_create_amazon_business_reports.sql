-- Amazon 비즈니스 리포트 테이블 생성
-- CSV 파일: BusinessReport (Analysis > 판매 및 트래픽 > 다운로드)

CREATE TABLE IF NOT EXISTS amazon_business_reports (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 날짜
  report_date DATE NOT NULL,

  -- 2-3. 주문 상품 판매량
  ordered_product_sales DECIMAL(12, 2) DEFAULT 0,
  ordered_product_sales_b2b DECIMAL(12, 2) DEFAULT 0,

  -- 4-5. 주문 수량
  units_ordered INTEGER DEFAULT 0,
  units_ordered_b2b INTEGER DEFAULT 0,

  -- 6-7. 총 주문 아이템
  total_order_items INTEGER DEFAULT 0,
  total_order_items_b2b INTEGER DEFAULT 0,

  -- 8-9. 주문 아이템당 평균 판매량
  avg_sales_per_order_item DECIMAL(10, 2) DEFAULT 0,
  avg_sales_per_order_item_b2b DECIMAL(10, 2) DEFAULT 0,

  -- 10-11. 주문 아이템당 평균 수량
  avg_units_per_order_item DECIMAL(5, 2) DEFAULT 0,
  avg_units_per_order_item_b2b DECIMAL(5, 2) DEFAULT 0,

  -- 12-13. 평균 판매 가격
  avg_selling_price DECIMAL(10, 2) DEFAULT 0,
  avg_selling_price_b2b DECIMAL(10, 2) DEFAULT 0,

  -- 14-19. 페이지 조회수
  page_views_mobile INTEGER DEFAULT 0,
  page_views_mobile_b2b INTEGER DEFAULT 0,
  page_views_browser INTEGER DEFAULT 0,
  page_views_browser_b2b INTEGER DEFAULT 0,
  page_views_total INTEGER DEFAULT 0,
  page_views_total_b2b INTEGER DEFAULT 0,

  -- 20-25. 세션
  sessions_mobile INTEGER DEFAULT 0,
  sessions_mobile_b2b INTEGER DEFAULT 0,
  sessions_browser INTEGER DEFAULT 0,
  sessions_browser_b2b INTEGER DEFAULT 0,
  sessions_total INTEGER DEFAULT 0,
  sessions_total_b2b INTEGER DEFAULT 0,

  -- 26-27. 추천 오퍼(바이 박스) 비율
  buy_box_percentage DECIMAL(5, 2) DEFAULT 0,
  buy_box_percentage_b2b DECIMAL(5, 2) DEFAULT 0,

  -- 28-31. 전환율
  order_item_session_percentage DECIMAL(5, 2) DEFAULT 0,
  order_item_session_percentage_b2b DECIMAL(5, 2) DEFAULT 0,
  unit_session_percentage DECIMAL(5, 2) DEFAULT 0,
  unit_session_percentage_b2b DECIMAL(5, 2) DEFAULT 0,

  -- 32-33. 경쟁 지표
  avg_offer_count INTEGER DEFAULT 0,
  avg_parent_items INTEGER DEFAULT 0,

  -- 34-37. 환불
  units_refunded INTEGER DEFAULT 0,
  units_refunded_b2b INTEGER DEFAULT 0,
  refund_rate DECIMAL(5, 2) DEFAULT 0,
  refund_rate_b2b DECIMAL(5, 2) DEFAULT 0,

  -- 38-43. 피드백
  feedback_received INTEGER DEFAULT 0,
  feedback_received_b2b INTEGER DEFAULT 0,
  negative_feedback_received INTEGER DEFAULT 0,
  negative_feedback_received_b2b INTEGER DEFAULT 0,
  negative_feedback_rate DECIMAL(5, 2) DEFAULT 0,
  negative_feedback_rate_b2b DECIMAL(5, 2) DEFAULT 0,

  -- 44-45. A-to-Z 클레임
  claims_granted INTEGER DEFAULT 0,
  claims_amount DECIMAL(10, 2) DEFAULT 0,

  -- 46-48. 배송
  shipped_product_sales DECIMAL(12, 2) DEFAULT 0,
  units_shipped INTEGER DEFAULT 0,
  orders_shipped INTEGER DEFAULT 0,

  -- 메타데이터
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 제약조건: 회사별 날짜 유일성 (중복 방지)
  UNIQUE(company_id, report_date)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_amazon_business_reports_company_date
  ON amazon_business_reports(company_id, report_date DESC);

CREATE INDEX idx_amazon_business_reports_date
  ON amazon_business_reports(report_date DESC);

-- 환불률 필터링용 (문제 있는 날짜 찾기)
CREATE INDEX idx_amazon_business_reports_refund_rate
  ON amazon_business_reports(company_id, refund_rate DESC)
  WHERE refund_rate > 5.0;

-- 전환율 분석용
CREATE INDEX idx_amazon_business_reports_conversion
  ON amazon_business_reports(company_id, order_item_session_percentage DESC);

-- RLS (Row Level Security) 정책
ALTER TABLE amazon_business_reports ENABLE ROW LEVEL SECURITY;

-- 조회 권한 (모든 사용자)
CREATE POLICY "Users can view business reports for their companies"
ON amazon_business_reports FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_business_reports.company_id
    AND user_companies.user_id = auth.uid()
  )
);

-- 수정 권한 (Editor, Admin)
CREATE POLICY "Editors can manage business reports"
ON amazon_business_reports FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = amazon_business_reports.company_id
    AND user_companies.user_id = auth.uid()
    AND user_companies.role IN ('admin', 'editor')
  )
);

-- updated_at 자동 업데이트 트리거
CREATE TRIGGER update_amazon_business_reports_updated_at
BEFORE UPDATE ON amazon_business_reports
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 코멘트 추가 (문서화)
COMMENT ON TABLE amazon_business_reports IS 'Amazon 비즈니스 리포트 일별 집계 데이터 (Analysis > 판매 및 트래픽)';
COMMENT ON COLUMN amazon_business_reports.report_date IS '리포트 날짜 (일별)';
COMMENT ON COLUMN amazon_business_reports.ordered_product_sales IS '주문 상품 판매량 (USD)';
COMMENT ON COLUMN amazon_business_reports.total_order_items IS '총 주문 아이템 수';
COMMENT ON COLUMN amazon_business_reports.refund_rate IS '환불률 (%)';
COMMENT ON COLUMN amazon_business_reports.order_item_session_percentage IS '주문 아이템 세션 전환율 (%)';
