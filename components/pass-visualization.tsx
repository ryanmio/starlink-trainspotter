"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Compass, Clock, TrendingUp } from "lucide-react"
import type { Pass, UserLocation } from "@/lib/types"

interface PassVisualizationProps {
  passes: Pass[]
  location: UserLocation
  selectedPass?: Pass | null
  onPassSelect?: (pass: Pass | null) => void
}

export function PassVisualization({ passes, location, selectedPass, onPassSelect }: PassVisualizationProps) {
  const [hoveredPass, setHoveredPass] = useState<Pass | null>(null)

  if (passes.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-8 text-center">
          <Eye className="h-8 w-8 mx-auto mb-2 text-blue-400 opacity-50" />
          <p className="text-blue-200">No passes to visualize</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Eye className="h-5 w-5" />
          Pass Visualization
        </CardTitle>
        <CardDescription className="text-blue-200">
          Visual representation of satellite pass trajectories and timing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sky Chart */}
          <div className="relative">
            <SkyChart
              passes={passes.slice(0, 5)}
              selectedPass={selectedPass}
              hoveredPass={hoveredPass}
              onPassSelect={onPassSelect}
              onPassHover={setHoveredPass}
            />
          </div>

          {/* Pass Timeline */}
          <div className="space-y-2">
            <h4 className="text-white font-medium">Pass Timeline</h4>
            <PassTimeline passes={passes.slice(0, 5)} selectedPass={selectedPass} onPassSelect={onPassSelect} />
          </div>

          {/* Pass Details */}
          {(selectedPass || hoveredPass) && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <PassDetails pass={selectedPass || hoveredPass!} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Sky chart component showing pass trajectories
function SkyChart({
  passes,
  selectedPass,
  hoveredPass,
  onPassSelect,
  onPassHover,
}: {
  passes: Pass[]
  selectedPass?: Pass | null
  hoveredPass?: Pass | null
  onPassSelect?: (pass: Pass | null) => void
  onPassHover?: (pass: Pass | null) => void
}) {
  const size = 200
  const center = size / 2

  return (
    <div className="flex justify-center">
      <div className="relative">
        <svg width={size} height={size} className="border border-white/20 rounded-full bg-slate-900/50">
          {/* Elevation circles */}
          {[30, 60, 90].map((elevation) => {
            const radius = (center * (90 - elevation)) / 90
            return (
              <circle
                key={elevation}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                strokeDasharray="2,2"
              />
            )
          })}

          {/* Cardinal directions */}
          <g className="text-xs fill-blue-300">
            <text x={center} y="12" textAnchor="middle">
              N
            </text>
            <text x={size - 8} y={center + 4} textAnchor="middle">
              E
            </text>
            <text x={center} y={size - 4} textAnchor="middle">
              S
            </text>
            <text x="8" y={center + 4} textAnchor="middle">
              W
            </text>
          </g>

          {/* Pass trajectories */}
          {passes.map((pass, index) => {
            const isSelected =
              selectedPass && pass.satId === selectedPass.satId && pass.start.getTime() === selectedPass.start.getTime()
            const isHovered =
              hoveredPass && pass.satId === hoveredPass.satId && pass.start.getTime() === hoveredPass.start.getTime()
            const color = isSelected ? "#10b981" : `hsl(${(index * 60) % 360}, 70%, 50%)`
            const opacity = isSelected || isHovered ? 1 : 0.6
            const strokeWidth = isSelected || isHovered ? 3 : 2

            // Convert azimuth/elevation to x/y coordinates
            const startPoint = azElToXY(pass.azStart, Math.min(pass.maxElDeg * 0.3, 20), center)
            const peakPoint = azElToXY((pass.azStart + pass.azEnd) / 2, pass.maxElDeg, center)
            const endPoint = azElToXY(pass.azEnd, Math.min(pass.maxElDeg * 0.3, 20), center)

            const pathData = `M ${startPoint.x} ${startPoint.y} Q ${peakPoint.x} ${peakPoint.y} ${endPoint.x} ${endPoint.y}`

            return (
              <g key={`${pass.satId}-${pass.start.getTime()}`}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={opacity}
                  className="cursor-pointer hover:opacity-100"
                  onMouseEnter={() => onPassHover?.(pass)}
                  onMouseLeave={() => onPassHover?.(null)}
                  onClick={() => onPassSelect?.(isSelected ? null : pass)}
                />
                <circle
                  cx={peakPoint.x}
                  cy={peakPoint.y}
                  r={isSelected || isHovered ? 4 : 3}
                  fill={color}
                  opacity={opacity}
                  className="cursor-pointer"
                  onMouseEnter={() => onPassHover?.(pass)}
                  onMouseLeave={() => onPassHover?.(null)}
                  onClick={() => onPassSelect?.(isSelected ? null : pass)}
                />
              </g>
            )
          })}
        </svg>

        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-blue-300">Sky Chart (elevation view)</p>
        </div>
      </div>
    </div>
  )
}

// Convert azimuth/elevation to x/y coordinates
function azElToXY(azimuth: number, elevation: number, center: number) {
  const radius = (center * (90 - elevation)) / 90
  const angleRad = ((azimuth - 90) * Math.PI) / 180 // Adjust for North = up
  return {
    x: center + radius * Math.cos(angleRad),
    y: center + radius * Math.sin(angleRad),
  }
}

// Timeline component showing pass timing
function PassTimeline({
  passes,
  selectedPass,
  onPassSelect,
}: {
  passes: Pass[]
  selectedPass?: Pass | null
  onPassSelect?: (pass: Pass | null) => void
}) {
  const now = new Date()
  const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const totalDuration = endTime.getTime() - now.getTime()

  return (
    <div className="relative h-16 bg-slate-900/50 rounded-lg border border-white/20 overflow-hidden">
      {/* Time markers */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: 8 }, (_, i) => {
          const time = new Date(now.getTime() + (i * totalDuration) / 7)
          return (
            <div key={i} className="flex-1 border-r border-white/10 last:border-r-0">
              <div className="text-xs text-blue-300 p-1">{i === 0 ? "Now" : `${i}d`}</div>
            </div>
          )
        })}
      </div>

      {/* Pass markers */}
      {passes.map((pass, index) => {
        const isSelected =
          selectedPass && pass.satId === selectedPass.satId && pass.start.getTime() === selectedPass.start.getTime()
        const startOffset = ((pass.start.getTime() - now.getTime()) / totalDuration) * 100
        const duration = ((pass.end.getTime() - pass.start.getTime()) / totalDuration) * 100
        const color = isSelected ? "#10b981" : `hsl(${(index * 60) % 360}, 70%, 50%)`

        if (startOffset < 0 || startOffset > 100) return null

        return (
          <div
            key={`${pass.satId}-${pass.start.getTime()}`}
            className="absolute top-8 h-6 cursor-pointer hover:opacity-100 transition-opacity"
            style={{
              left: `${startOffset}%`,
              width: `${Math.max(duration, 0.5)}%`,
              backgroundColor: color,
              opacity: isSelected ? 1 : 0.7,
            }}
            onClick={() => onPassSelect?.(isSelected ? null : pass)}
            title={`${pass.launchName} - ${pass.start.toLocaleTimeString()}`}
          />
        )
      })}
    </div>
  )
}

// Detailed pass information
function PassDetails({ pass }: { pass: Pass }) {
  return (
    <div>
      <h4 className="text-white font-medium mb-2">{pass.launchName}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2 text-blue-200">
          <Clock className="h-4 w-4" />
          <div>
            <div>Start: {pass.start.toLocaleTimeString()}</div>
            <div>Peak: {pass.peak.toLocaleTimeString()}</div>
            <div>End: {pass.end.toLocaleTimeString()}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-blue-200">
          <TrendingUp className="h-4 w-4" />
          <div>
            <div>Max Elevation: {pass.maxElDeg.toFixed(0)}°</div>
            <div>Score: {pass.score.toFixed(1)}</div>
            <div>Phase: {pass.phaseAngleDeg.toFixed(0)}°</div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2 text-blue-300">
        <Compass className="h-4 w-4" />
        <span>
          Path: {pass.azStart.toFixed(0)}° → {pass.azEnd.toFixed(0)}°
        </span>
        {pass.boosterInfo && (
          <Badge variant="outline" className="border-blue-400/50 text-blue-400 ml-auto">
            Flight #{pass.boosterInfo.flightNumber}
          </Badge>
        )}
      </div>
    </div>
  )
}
