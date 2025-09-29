#!/bin/bash

# Matrix API 파일들에 company_id 필터링 추가하는 스크립트

echo "📝 Matrix API들에 company_id 필터링 추가 중..."

# 1. daily-matrix
echo "✅ Processing daily-matrix..."
sed -i '' '/const endDate = searchParams.get.*endDate.*/a\
    const companyId = searchParams.get("companyId")\
\
    if (!companyId) {\
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })\
    }
' app/api/matrix/daily-matrix/route.ts

# orders 테이블 쿼리에 company_id 필터 추가
sed -i '' 's/.eq("sku_unit_original_price", 0)/.eq("sku_unit_original_price", 0)\
      .eq("company_id", companyId)/g' app/api/matrix/daily-matrix/route.ts

# 2. weekly-matrix
echo "✅ Processing weekly-matrix..."
sed -i '' '/const endDate = searchParams.get.*endDate.*/a\
    const companyId = searchParams.get("companyId")\
\
    if (!companyId) {\
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })\
    }
' app/api/matrix/weekly-matrix/route.ts

sed -i '' 's/.eq("sku_unit_original_price", 0)/.eq("sku_unit_original_price", 0)\
      .eq("company_id", companyId)/g' app/api/matrix/weekly-matrix/route.ts

# 3. monthly-matrix
echo "✅ Processing monthly-matrix..."
sed -i '' '/const endDate = searchParams.get.*endDate.*/a\
    const companyId = searchParams.get("companyId")\
\
    if (!companyId) {\
      return NextResponse.json({ error: "companyId is required" }, { status: 400 })\
    }
' app/api/matrix/monthly-matrix/route.ts

sed -i '' 's/.eq("sku_unit_original_price", 0)/.eq("sku_unit_original_price", 0)\
      .eq("company_id", companyId)/g' app/api/matrix/monthly-matrix/route.ts

# 4. all-matrix
echo "✅ Processing all-matrix..."
sed -i '' '/export async function GET(request: Request)/a\
  const { searchParams } = new URL(request.url)\
  const companyId = searchParams.get("companyId")\
\
  if (!companyId) {\
    return NextResponse.json({ error: "companyId is required" }, { status: 400 })\
  }
' app/api/matrix/all-matrix/route.ts

echo "✨ 완료!"