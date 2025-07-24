"use client"

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface QuantityChartProps {
  data: Array<{
    date?: string
    week?: string
    month?: string
    product?: string
    totalQuantity: number
  }>
  title: string
  type?: "line" | "bar"
}

export function QuantityChart({ data, title, type = "line" }: QuantityChartProps) {
  const chartData = data.map((item) => ({
    name: item.date || item.week || item.month || item.product || "",
    value: item.totalQuantity,
  }))

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {type === "line" ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        ) : (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
