"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, Satellite, Eye, Clock } from "lucide-react"

interface VisibleRegion {
  id: string
  location: string
  country: string
  coordinates: [number, number]
  trainCount: number
  maxElevation: number
  duration: number
  quality: "excellent" | "good" | "fair"
  timeUntilPeak: number
}

interface GlobalVisibilityProps {
  onLocationSelect?: (lat: number, lon: number, name: string) => void
}

export function GlobalVisibility({ onLocationSelect }: GlobalVisibilityProps) {
  const [visibleRegions, setVisibleRegions] = useState<VisibleRegion[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Mock data for demonstration - in real implementation, this would come from TLE calculations
  const generateMockVisibility = (): VisibleRegion[] => {
    const regions = [
      { location: "Northern California", country: "USA", coordinates: [37.7749, -122.4194] as [number, number] },
      { location: "London", country: "UK", coordinates: [51.5074, -0.1278] as [number, number] },
      { location: "Sydney", country: "Australia", coordinates: [-33.8688, 151.2093] as [number, number] },
      { location: "Tokyo", country: "Japan", coordinates: [35.6762, 139.6503] as [number, number] },
      { location: "Berlin", country: "Germany", coordinates: [52.52, 13.405] as [number, number] },
      { location: "São Paulo", country: "Brazil", coordinates: [-23.5505, -46.6333] as [number, number] },
      { location: "Mumbai", country: "India", coordinates: [19.076, 72.8777] as [number, number] },
      { location: "Cape Town", country: "South Africa", coordinates: [-33.9249, 18.4241] as [number, number] },
    ]

    return regions
      .map((region, index) => ({
        id: `region-${index}`,
        location: region.location,
        country: region.country,
        coordinates: region.coordinates,
        trainCount: Math.floor(Math.random() * 15) + 3,
        maxElevation: Math.floor(Math.random() * 60) + 20,
        duration: Math.floor(Math.random() * 300) + 120,
        quality: ["excellent", "good", "fair"][Math.floor(Math.random() * 3)] as "excellent" | "good" | "fair",
        timeUntilPeak: Math.floor(Math.random() * 600) + 30,
      }))
      .filter(() => Math.random() > 0.4) // Randomly show some regions as having visible trains
      .sort((a, b) => a.timeUntilPeak - b.timeUntilPeak)
  }

  useEffect(() => {
    const updateVisibility = () => {
      console.log("[v0] Updating global visibility data")
      setVisibleRegions(generateMockVisibility())
      setLastUpdate(new Date())
      setLoading(false)
    }

    updateVisibility()
    const interval = setInterval(updateVisibility, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "bg-green-500"
      case "good":
        return "bg-yellow-500"
      case "fair":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  const formatTimeUntil = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}m`
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Starlink Visibility
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2">Loading global visibility data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Global Starlink Visibility
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Live view of where Starlink trains are currently visible worldwide
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {visibleRegions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Satellite className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No Starlink trains currently visible worldwide</p>
            <p className="text-sm">Check back in a few minutes</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {visibleRegions.map((region) => (
                <div
                  key={region.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => onLocationSelect?.(region.coordinates[0], region.coordinates[1], region.location)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getQualityColor(region.quality)}`} />
                    <div>
                      <div className="font-medium">{region.location}</div>
                      <div className="text-sm text-muted-foreground">{region.country}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{region.trainCount}</div>
                      <div className="text-xs text-muted-foreground">trains</div>
                    </div>

                    <div className="text-center">
                      <div className="font-medium">{region.maxElevation}°</div>
                      <div className="text-xs text-muted-foreground">max elev</div>
                    </div>

                    <div className="text-center">
                      <div className="font-medium">{formatDuration(region.duration)}</div>
                      <div className="text-xs text-muted-foreground">duration</div>
                    </div>

                    <Badge variant="outline" className="text-xs">
                      Peak in {formatTimeUntil(region.timeUntilPeak)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                {visibleRegions.length} regions with visible trains
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLoading(true)
                  setTimeout(() => {
                    setVisibleRegions(generateMockVisibility())
                    setLastUpdate(new Date())
                    setLoading(false)
                  }, 1000)
                }}
              >
                Refresh
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
