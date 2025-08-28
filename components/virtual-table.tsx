"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface VirtualTableProps<T> {
  data: T[]
  columns: {
    key: string
    header: string
    render?: (item: T) => React.ReactNode
    align?: "left" | "center" | "right"
  }[]
  rowHeight?: number
  containerHeight?: number
  overscan?: number
}

export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  containerHeight = 600,
  overscan = 3
}: VirtualTableProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const totalHeight = data.length * rowHeight
  const visibleRows = Math.ceil(containerHeight / rowHeight)
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const endIndex = Math.min(data.length - 1, startIndex + visibleRows + overscan * 2)
  
  const visibleData = data.slice(startIndex, endIndex + 1)
  const offsetY = startIndex * rowHeight
  
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop)
    }
  }, [])
  
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])
  
  return (
    <div 
      ref={containerRef}
      className="overflow-auto border rounded-md"
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  className={column.align === 'right' ? 'text-right' : ''}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <tr style={{ height: offsetY }} />
            {visibleData.map((item, index) => (
              <TableRow 
                key={startIndex + index}
                style={{ height: rowHeight }}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={column.key}
                    className={column.align === 'right' ? 'text-right' : ''}
                  >
                    {column.render ? column.render(item) : item[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}