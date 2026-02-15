import type { WindRoseResponse } from '../api/client'

type WindRoseProps = {
  data: WindRoseResponse
  compact?: boolean
}

const COLOR_SCALE = ['#0b2f3f', '#145f73', '#00d4aa', '#f5a623', '#ffdd82', '#ffd5a6']

export function WindRose({ data, compact = false }: WindRoseProps) {
  const size = compact ? 200 : 320
  const center = size / 2
  const innerRadius = compact ? 20 : 34
  const outerRadius = compact ? 84 : 134
  const maxTotal = Math.max(...data.sectors.map((sector) => sector.total), 1)

  const sectorArc = (360 / data.sectors.length) * (Math.PI / 180)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="wind-rose-svg">
      <circle cx={center} cy={center} r={outerRadius + 8} className="wind-rose-ring" />
      <circle cx={center} cy={center} r={innerRadius} className="wind-rose-core" />

      {data.sectors.map((sector, sectorIndex) => {
        const baseAngle = (sector.direction_center_deg - 90) * (Math.PI / 180)
        const startAngle = baseAngle - sectorArc / 2

        let currentInner = innerRadius

        return sector.counts.map((count, speedIndex) => {
          const segmentSize = (count / maxTotal) * (outerRadius - innerRadius)
          const segmentOuter = currentInner + segmentSize

          const x1 = center + currentInner * Math.cos(startAngle)
          const y1 = center + currentInner * Math.sin(startAngle)
          const x2 = center + segmentOuter * Math.cos(startAngle)
          const y2 = center + segmentOuter * Math.sin(startAngle)
          const x3 = center + segmentOuter * Math.cos(startAngle + sectorArc)
          const y3 = center + segmentOuter * Math.sin(startAngle + sectorArc)
          const x4 = center + currentInner * Math.cos(startAngle + sectorArc)
          const y4 = center + currentInner * Math.sin(startAngle + sectorArc)

          const path = `M ${x1} ${y1} L ${x2} ${y2} A ${segmentOuter} ${segmentOuter} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${currentInner} ${currentInner} 0 0 0 ${x1} ${y1} Z`

          currentInner = segmentOuter

          if (count <= 0) return null
          return <path key={`${sectorIndex}-${speedIndex}`} d={path} fill={COLOR_SCALE[speedIndex % COLOR_SCALE.length]} opacity={0.9} />
        })
      })}

      <text x={center} y={18} textAnchor="middle" className="wind-rose-label">
        N
      </text>
      <text x={center} y={size - 10} textAnchor="middle" className="wind-rose-label">
        S
      </text>
      <text x={18} y={center + 4} textAnchor="middle" className="wind-rose-label">
        W
      </text>
      <text x={size - 18} y={center + 4} textAnchor="middle" className="wind-rose-label">
        E
      </text>
    </svg>
  )
}
