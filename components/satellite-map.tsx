"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Map, Layers, Eye, EyeOff } from "lucide-react"
import type { Pass, UserLocation } from "@/lib/types"

// Dynamic import for Leaflet to avoid SSR issues
let L: any = null
if (typeof window !== "undefined") {
  import("leaflet").then((leaflet) => {
    L = leaflet.default
    // Fix for default markers in Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    })
  })
}

interface SatelliteMapProps {
  passes: Pass[]
  location: UserLocation
  selectedPass?: Pass | null
  onPassSelect?: (pass: Pass | null) => void
}

export function SatelliteMap({ passes, location, selectedPass, onPassSelect }: SatelliteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [showAllTracks, setShowAllTracks] = useState(false)

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || !L || mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [location.lat, location.lon],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    })

    // Add tile layer with dark theme
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map
    setMapReady(true)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [location])

  // Update observer location marker
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !mapReady) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    // Add observer location marker
    const observerIcon = L.divIcon({
      className: "observer-marker",
      html: `<div style="
        width: 20px; 
        height: 20px; 
        background: #3b82f6; 
        border: 3px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })

    const observerMarker = L.marker([location.lat, location.lon], { icon: observerIcon })
      .addTo(mapInstanceRef.current)
      .bindPopup(`<strong>Your Location</strong><br/>${location.name || "Observer"}`)

    markersRef.current.push(observerMarker)

    // Center map on observer location
    mapInstanceRef.current.setView([location.lat, location.lon], 8)
  }, [location, mapReady])

  // Update satellite tracks
  useEffect(() => {
    if (!mapInstanceRef.current || !L || !mapReady) return

    // Clear existing tracks (keep observer marker)
    const observerMarker = markersRef.current[0]
    markersRef.current.forEach((marker, index) => {
      if (index > 0) marker.remove()
    })
    markersRef.current = observerMarker ? [observerMarker] : []

    const passesToShow = showAllTracks ? passes.slice(0, 5) : selectedPass ? [selectedPass] : []

    passesToShow.forEach((pass, index) => {
      const isSelected =
        selectedPass && pass.satId === selectedPass.satId && pass.start.getTime() === selectedPass.start.getTime()
      const color = isSelected ? "#10b981" : `hsl(${(index * 60) % 360}, 70%, 50%)`
      const opacity = isSelected ? 1 : 0.7
      const weight = isSelected ? 3 : 2

      // Generate ground track points
      const trackPoints = generateGroundTrack(pass, location)

      if (trackPoints.length > 0) {
        // Draw ground track
        const track = L.polyline(trackPoints, {
          color,
          weight,
          opacity,
          dashArray: isSelected ? undefined : "5, 5",
        }).addTo(mapInstanceRef.current)

        // Add start marker
        const startIcon = L.divIcon({
          className: "pass-marker",
          html: `<div style="
            width: 12px; 
            height: 12px; 
            background: ${color}; 
            border: 2px solid white; 
            border-radius: 50%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        })

        const startMarker = L.marker(trackPoints[0], { icon: startIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <strong>${pass.launchName}</strong><br/>
            Start: ${pass.start.toLocaleTimeString()}<br/>
            Max Elevation: ${pass.maxElDeg.toFixed(0)}°<br/>
            Score: ${pass.score.toFixed(1)}
          `)

        // Add click handler for track selection
        track.on("click", () => {
          if (onPassSelect) {
            onPassSelect(isSelected ? null : pass)
          }
        })

        startMarker.on("click", () => {
          if (onPassSelect) {
            onPassSelect(isSelected ? null : pass)
          }
        })

        markersRef.current.push(track, startMarker)
      }
    })
  }, [passes, selectedPass, showAllTracks, mapReady, location])

  if (!L) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-8 text-center">
          <div className="text-blue-200">Loading map...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Map className="h-5 w-5" />
              Satellite Ground Tracks
            </CardTitle>
            <CardDescription className="text-blue-200">
              {selectedPass ? "Showing selected pass trajectory" : "Click on a pass to see its ground track"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {selectedPass && (
              <Badge variant="outline" className="border-green-400/50 text-green-400">
                {selectedPass.launchName}
              </Badge>
            )}
            <Button
              onClick={() => setShowAllTracks(!showAllTracks)}
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              {showAllTracks ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAllTracks ? "Hide All" : "Show All"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            ref={mapRef}
            className="w-full h-96 rounded-lg overflow-hidden border border-white/20"
            style={{ background: "#1e293b" }}
          />

          {passes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <div className="text-center text-white">
                <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No passes to display</p>
              </div>
            </div>
          )}
        </div>

        {selectedPass && (
          <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium">{selectedPass.launchName}</h4>
              <Button
                onClick={() => onPassSelect?.(null)}
                size="sm"
                variant="ghost"
                className="text-blue-300 hover:text-white hover:bg-white/10"
              >
                Clear Selection
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-300">Start:</span>
                <span className="text-white ml-2">{selectedPass.start.toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="text-blue-300">Peak:</span>
                <span className="text-white ml-2">{selectedPass.peak.toLocaleTimeString()}</span>
              </div>
              <div>
                <span className="text-blue-300">Max Elevation:</span>
                <span className="text-white ml-2">{selectedPass.maxElDeg.toFixed(0)}°</span>
              </div>
              <div>
                <span className="text-blue-300">Score:</span>
                <span className="text-white ml-2">{selectedPass.score.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Generate ground track points for a satellite pass
function generateGroundTrack(pass: Pass, observerLocation: UserLocation): [number, number][] {
  const points: [number, number][] = []
  const duration = pass.end.getTime() - pass.start.getTime()
  const steps = Math.min(50, Math.max(10, duration / (30 * 1000))) // 30 second steps, 10-50 points

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const time = new Date(pass.start.getTime() + t * duration)

    // Generate approximate ground track based on pass geometry
    // This is a simplified calculation - in a real implementation, you'd use
    // satellite.js to propagate the actual orbital position
    const lat = generateTrackLatitude(pass, observerLocation, t)
    const lon = generateTrackLongitude(pass, observerLocation, t)

    points.push([lat, lon])
  }

  return points
}

// Generate latitude for ground track point (simplified)
function generateTrackLatitude(pass: Pass, observer: UserLocation, t: number): number {
  // Approximate satellite path - in reality this would be calculated from orbital mechanics
  const maxDeviation = 10 // degrees
  const latOffset = Math.sin(t * Math.PI) * maxDeviation * (Math.random() * 0.4 + 0.8)
  return Math.max(-85, Math.min(85, observer.lat + latOffset))
}

// Generate longitude for ground track point (simplified)
function generateTrackLongitude(pass: Pass, observer: UserLocation, t: number): number {
  // Approximate east-west movement based on azimuth
  const azimuthRange = pass.azEnd - pass.azStart
  const lonOffset = (azimuthRange / 360) * 30 * t // Approximate movement
  let lon = observer.lon + lonOffset

  // Wrap longitude
  while (lon > 180) lon -= 360
  while (lon < -180) lon += 360

  return lon
}
