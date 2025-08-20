"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Compass, ChevronDown, ChevronUp, Share2, Download } from "lucide-react"
import { Loader2 } from "lucide-react"
import { ShareableCard } from "@/components/shareable-card"
import type { Pass, UserLocation } from "@/lib/types"

interface PassListProps {
  passes: Pass[]
  loading: boolean
  location?: UserLocation
  onRefresh?: () => void
}

export function PassList({ passes, loading, location, onRefresh }: PassListProps) {
  const [expandedPass, setExpandedPass] = useState<string | null>(null)
  const [shareCardPass, setShareCardPass] = useState<Pass | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
        <span className="ml-2 text-blue-200">Calculating predictions...</span>
      </div>
    )
  }

  if (passes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-blue-200 mb-4">No visible passes found in the next 7 days</div>
        {onRefresh && (
          <Button
            onClick={onRefresh}
            size="sm"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
          >
            Try Again
          </Button>
        )}
      </div>
    )
  }

  // Show shareable card if selected
  if (shareCardPass && location) {
    return <ShareableCard pass={shareCardPass} location={location} onClose={() => setShareCardPass(null)} />
  }

  const handleShare = async (pass: Pass) => {
    if (navigator.share && location) {
      try {
        await navigator.share({
          title: `Starlink Train Pass - ${pass.launchName}`,
          text: `Starlink satellite train visible from ${location.name} on ${pass.start.toLocaleDateString()} at ${pass.start.toLocaleTimeString()}`,
          url: window.location.href,
        })
      } catch (error) {
        // Fallback to clipboard
        const shareText = `Starlink Train Pass: ${pass.launchName} visible from ${location.name} on ${pass.start.toLocaleDateString()} at ${pass.start.toLocaleTimeString()}`
        navigator.clipboard.writeText(shareText)
        alert("Pass details copied to clipboard!")
      }
    }
  }

  return (
    <div className="space-y-3">
      {passes.slice(0, 3).map((pass, index) => {
        const passKey = `${pass.satId}-${pass.start.getTime()}`
        const isExpanded = expandedPass === passKey

        return (
          <Card key={passKey} className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-600/20 text-blue-200">
                    #{index + 1}
                  </Badge>
                  <span className="text-white font-medium">{pass.launchName || "Starlink Mission"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-400/50 text-green-400">
                    Score: {pass.score.toFixed(1)}
                  </Badge>
                  <Button
                    onClick={() => setShareCardPass(pass)}
                    size="sm"
                    variant="ghost"
                    className="text-blue-300 hover:text-white hover:bg-white/10 p-1"
                    title="Create shareable card"
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={() => handleShare(pass)}
                    size="sm"
                    variant="ghost"
                    className="text-blue-300 hover:text-white hover:bg-white/10 p-1"
                    title="Share pass details"
                  >
                    <Share2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div className="flex items-center gap-2 text-blue-200">
                  <Clock className="h-4 w-4" />
                  <div>
                    <div>Start: {pass.start.toLocaleTimeString()}</div>
                    <div>Peak: {pass.peak.toLocaleTimeString()}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-blue-200">
                  <TrendingUp className="h-4 w-4" />
                  <div>
                    <div>Max Alt: {pass.maxElDeg.toFixed(0)}°</div>
                    <div>Duration: {Math.round((pass.end.getTime() - pass.start.getTime()) / 60000)}m</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-blue-300">
                  <div className="flex items-center gap-1">
                    <Compass className="h-3 w-3" />
                    <span>
                      {pass.azStart.toFixed(0)}° → {pass.azEnd.toFixed(0)}°
                    </span>
                  </div>
                  {pass.boosterInfo && <span>Flight #{pass.boosterInfo.flightNumber}</span>}
                </div>

                <Button
                  onClick={() => setExpandedPass(isExpanded ? null : passKey)}
                  size="sm"
                  variant="ghost"
                  className="text-blue-300 hover:text-white hover:bg-white/10"
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-blue-300 font-medium">Date</div>
                      <div className="text-white">{pass.start.toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 font-medium">End Time</div>
                      <div className="text-white">{pass.end.toLocaleTimeString()}</div>
                    </div>
                    <div>
                      <div className="text-blue-300 font-medium">Phase Angle</div>
                      <div className="text-white">{pass.phaseAngleDeg.toFixed(0)}°</div>
                    </div>
                    <div>
                      <div className="text-blue-300 font-medium">Satellite ID</div>
                      <div className="text-white text-xs">{pass.satId.slice(0, 8)}...</div>
                    </div>
                  </div>

                  {pass.boosterInfo && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <div className="text-blue-300 font-medium mb-2">Booster Information</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-blue-200">Core ID:</span>
                          <span className="text-white ml-2">{pass.boosterInfo.coreId.slice(0, 8)}...</span>
                        </div>
                        <div>
                          <span className="text-blue-200">Flight:</span>
                          <span className="text-white ml-2">#{pass.boosterInfo.flightNumber}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-blue-200">Landing:</span>
                          <span className="text-white ml-2">{pass.boosterInfo.landingType}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {passes.length > 3 && (
        <div className="text-center pt-2">
          <p className="text-blue-300 text-sm">Showing top 3 of {passes.length} predicted passes</p>
        </div>
      )}
    </div>
  )
}
