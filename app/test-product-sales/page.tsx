"use client"

import { useState, useEffect } from "react"

export default function TestProductSales() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/product-sales?groupBy=all')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result = await response.json()
        console.log('Fetched data:', result)
        setData(result)
      } catch (err) {
        console.error('Fetch error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Product Sales API</h1>
      <div className="space-y-2">
        <div>총 판매 수량: {data?.totalQuantity ?? 'N/A'}</div>
        <div>총 매출액: ${data?.totalRevenue ?? 'N/A'}</div>
        <div>제품 종류: {data?.uniqueProducts ?? 'N/A'}</div>
        <div>총 주문 수: {data?.totalOrders ?? 'N/A'}</div>
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <pre>{JSON.stringify(data, null, 2)}</pre>
      </div>
    </div>
  )
}