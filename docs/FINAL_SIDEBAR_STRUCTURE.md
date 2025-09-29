# 📱 최종 사이드바 구조 설계

## 🎯 전체 구조

```
🏠 대시보드
└── 통합 대시보드 (홈)
    - TikTok vs Amazon 비교
    - 핵심 지표 요약
    - 판매 추이 그래프

📱 TikTok Shop (수동 데이터 업로드)
├── SKU별 판매 분석
│   └── Daily/Weekly/Monthly 테이블
├── 샘플 발송 현황
│   └── 발송 날짜, 수량, 크리에이터 정보
├── 콘텐츠 발행 현황
│   └── 주간/월간 발행 수
├── 콘텐츠 성과 분석
│   └── 조회수, 좋아요, 댓글, 공유
└── 📤 데이터 업로드
    └── CSV/Excel 파일 업로드

📦 Amazon (API 자동 연동)
├── 전체 판매 성과
│   └── 총 판매액, 주문 수, 배송 건수
├── ASIN별 판매 분석
│   └── Daily/Weekly/Monthly 테이블
├── 비용 분석
│   └── 주문당 비용 (Cost per Order)
├── 전환율 분석
│   └── 구매 전환율, 환불율
└── ⚙️ API 설정
    └── API 연동 상태 확인

🔧 시스템 관리 (Admin/Editor만)
├── 데이터 관리
│   ├── TikTok 데이터 업로드
│   ├── 콘텐츠 데이터 업로드
│   └── 데이터 내보내기
└── 설정
    └── 회사 설정
```

## 💻 구현 코드 구조

```typescript
// 사이드바 메뉴 구조
const sidebarStructure = {
  // 대시보드 섹션
  dashboard: {
    id: "dashboard",
    title: "대시보드",
    icon: "Home",
    color: "text-blue-600",
    items: [
      {
        title: "통합 대시보드",
        url: "/",
        description: "TikTok & Amazon 통합 분석",
      },
    ],
  },

  // TikTok 섹션
  tiktok: {
    id: "tiktok",
    title: "TikTok Shop",
    icon: "Package",
    color: "text-pink-500",
    badge: "수동 업로드",
    collapsible: true,
    items: [
      {
        title: "SKU별 판매 분석",
        url: "/tiktok/sales",
        icon: "TrendingUp",
        description: "SKU별 판매량, 판매액, 재고",
      },
      {
        title: "샘플 발송 현황",
        url: "/tiktok/samples",
        icon: "Send",
        description: "샘플 발송 추적 관리",
      },
      {
        title: "콘텐츠 발행 현황",
        url: "/tiktok/content",
        icon: "Video",
        description: "주간/월간 콘텐츠 발행",
      },
      {
        title: "콘텐츠 성과 분석",
        url: "/tiktok/content-analysis",
        icon: "BarChart",
        description: "콘텐츠 성과 지표",
      },
      {
        divider: true,
      },
      {
        title: "데이터 업로드",
        url: "/tiktok/upload",
        icon: "Upload",
        badge: "CSV/Excel",
        description: "TikTok 데이터 가져오기",
      },
    ],
  },

  // Amazon 섹션
  amazon: {
    id: "amazon",
    title: "Amazon",
    icon: "ShoppingCart",
    color: "text-orange-500",
    badge: "API 연동",
    collapsible: true,
    items: [
      {
        title: "전체 판매 성과",
        url: "/amazon/overview",
        icon: "DollarSign",
        description: "총 판매액, 주문 수",
      },
      {
        title: "ASIN별 판매 분석",
        url: "/amazon/products",
        icon: "Package2",
        description: "ASIN별 상세 판매 데이터",
      },
      {
        title: "비용 분석",
        url: "/amazon/costs",
        icon: "Receipt",
        description: "주문당 비용 추이",
      },
      {
        title: "전환율 분석",
        url: "/amazon/conversion",
        icon: "Target",
        description: "구매 전환율, 환불율",
      },
      {
        divider: true,
      },
      {
        title: "API 설정",
        url: "/amazon/settings",
        icon: "Settings",
        badge: "Auto",
        description: "API 연동 관리",
      },
    ],
  },

  // 관리자 섹션
  admin: {
    id: "admin",
    title: "시스템 관리",
    icon: "Settings",
    color: "text-gray-600",
    roleRequired: ["admin", "editor"],
    collapsible: true,
    items: [
      {
        title: "데이터 관리",
        url: "/admin/data",
        icon: "Database",
        submenu: [
          { title: "TikTok 데이터 업로드", url: "/admin/upload/tiktok" },
          { title: "콘텐츠 데이터 업로드", url: "/admin/upload/content" },
          { title: "데이터 내보내기", url: "/admin/export" },
        ],
      },
      {
        title: "설정",
        url: "/admin/settings",
        icon: "Sliders",
      },
    ],
  },
};
```

## 🎨 UI/UX 특징

### 1. 시각적 구분

- **색상 코딩**
  - TikTok: 핑크/레드 계열 (#FF6B6B)
  - Amazon: 오렌지 계열 (#FF9500)
  - 대시보드: 블루 계열 (#3B82F6)
  - 관리: 그레이 계열 (#6B7280)

### 2. 배지(Badge) 시스템

- **수동 업로드**: TikTok 섹션에 표시
- **API 연동**: Amazon 섹션에 표시
- **CSV/Excel**: 업로드 메뉴에 표시
- **Auto**: 자동 연동 메뉴에 표시

### 3. 접기/펼치기 기능

- 각 섹션별 접기/펼치기 가능
- 사용자 선호도 localStorage 저장
- 기본값: 대시보드와 현재 플랫폼만 열림

### 4. 권한별 표시

- Viewer: 대시보드, TikTok 조회, Amazon 조회
- Editor: + 데이터 업로드 메뉴
- Admin: + 시스템 관리 메뉴

## 📊 데이터 표시 형식

### 공통 기능 (모든 상세 페이지)

```typescript
interface DataViewOptions {
  period: "daily" | "weekly" | "monthly";
  dateRange: DateRange;
  displayFormat: "table" | "chart" | "both";
  exportOptions: ["csv", "excel", "pdf"];
}

// 기간 선택 탭
<Tabs defaultValue="daily">
  <TabsList>
    <TabsTrigger value="daily">일별</TabsTrigger>
    <TabsTrigger value="weekly">주별</TabsTrigger>
    <TabsTrigger value="monthly">월별</TabsTrigger>
  </TabsList>
  <TabsContent>{/* 테이블 또는 차트 */}</TabsContent>
</Tabs>;
```

## 🚀 구현 우선순위

### Phase 1 (1주차)

1. 새로운 사이드바 컴포넌트 구조 구현
2. 플랫폼별 색상 및 아이콘 적용
3. 접기/펼치기 기능 구현

### Phase 2 (2주차)

1. TikTok 섹션 페이지 구현
   - SKU별 판매 분석
   - 샘플 발송 현황
   - 데이터 업로드 (CSV/Excel)

### Phase 3 (3주차)

1. Amazon 섹션 페이지 구현
   - 전체 판매 성과
   - ASIN별 판매 분석
   - API 연동 설정 (Mock)

### Phase 4 (4주차)

1. 데이터 테이블 공통 컴포넌트
2. Daily/Weekly/Monthly 뷰 전환
3. 데이터 export 기능

## 🔄 마이그레이션 계획

### 기존 경로 → 새 경로 매핑

```
/sample-summary      → /tiktok/samples
/sales-analysis      → /tiktok/sales
/content            → /tiktok/content
/content-analysis   → /tiktok/content-analysis
/upload             → /tiktok/upload
/upload-content     → /admin/upload/content
```

### 리다이렉트 설정

```typescript
// next.config.js
module.exports = {
  redirects: async () => [
    {
      source: "/:companyId/sample-summary",
      destination: "/:companyId/tiktok/samples",
      permanent: true,
    },
    // ... 기타 리다이렉트
  ],
};
```
