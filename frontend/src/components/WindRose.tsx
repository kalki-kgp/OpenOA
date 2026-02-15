import { useMemo } from "react";
import { WindRoseBin } from "../api/client";

interface WindRoseProps {
  bins: WindRoseBin[];
  size?: number;
}

const SPEED_COLORS = ["#00D4AA", "#58A6FF", "#F5A623", "#A371F7", "#79C0FF"];

export default function WindRose({ bins, size = 200 }: WindRoseProps) {
  const maxFreq = useMemo(() => Math.max(...bins.map((b) => b.frequency), 0.01), [bins]);
  const dirCount = 16;
  const speedLevels = 5;

  const bars = useMemo(() => {
    const result: { dir: number; speed: number; freq: number; color: string }[] = [];
    for (let d = 0; d < dirCount; d++) {
      const dirCenter = (d + 0.5) * (360 / dirCount);
      for (let s = 0; s < speedLevels; s++) {
        const matching = bins.filter(
          (b) =>
            Math.abs(b.direction_center - dirCenter) < 12 &&
            b.speed_min >= s * 3 &&
            b.speed_max <= (s + 1) * 3 + 1
        );
        const freq = matching.reduce((a, b) => a + b.frequency, 0);
        if (freq > 0) {
          result.push({
            dir: dirCenter,
            speed: s,
            freq,
            color: SPEED_COLORS[s % SPEED_COLORS.length],
          });
        }
      }
    }
    return result;
  }, [bins]);

  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 20;

  return (
    <svg width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      {/* Grid circles */}
      {[0.25, 0.5, 0.75, 1].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={maxR * r}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        />
      ))}
      {/* Direction lines */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = cx + maxR * Math.sin(rad);
        const y = cy - maxR * Math.cos(rad);
        return (
          <line
            key={deg}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--border-subtle)"
            strokeWidth={0.5}
          />
        );
      })}
      {/* Bars */}
      {bars.map((bar, i) => {
        const rad = ((bar.dir - 90) * Math.PI) / 180;
        const innerR = maxR * (bar.speed / speedLevels) * 0.9;
        const outerR = maxR * ((bar.speed + 1) / speedLevels) * 0.9;
        const w = (bar.freq / maxFreq) * (maxR / 4);
        const x1 = cx + innerR * Math.cos(rad);
        const y1 = cy + innerR * Math.sin(rad);
        const x2 = cx + (outerR + w) * Math.cos(rad);
        const y2 = cy + (outerR + w) * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={bar.color}
            strokeWidth={Math.max(2, w)}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
