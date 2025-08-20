"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MapPin, Loader2, RefreshCw } from "lucide-react"
import type { UserLocation } from "@/lib/types"

interface LocationPickerProps {
  onLocationChange: (location: UserLocation) => void
  currentLocation?: UserLocation | null
  onRefresh?: () => void
}

export function LocationPicker({ onLocationChange, currentLocation, onRefresh }: LocationPickerProps) {
  const [loading, setLoading] = useState(false)
  const [manualLocation, setManualLocation] = useState("")

  const handleGeolocate = async () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by this browser")
      return
    }

    setLoading(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        // Get timezone from browser
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Reverse geocode to get location name
        try {
          const response = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`)
          const data = await response.json()

          onLocationChange({
            lat: latitude,
            lon: longitude,
            name: data.name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            timezone,
          })
        } catch (error) {
          onLocationChange({
            lat: latitude,
            lon: longitude,
            name: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            timezone,
          })
        }

        setLoading(false)
      },
      (error) => {
        console.error("Geolocation error:", error)
        alert("Unable to get your location. Please enter it manually.")
        setLoading(false)
      },
    )
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualLocation.trim()) return

    setLoading(true)

    try {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(manualLocation)}`)
      const data = await response.json()

      if (data.lat && data.lon) {
        onLocationChange({
          lat: data.lat,
          lon: data.lon,
          name: data.name || manualLocation,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        setManualLocation("")
      } else {
        alert("Location not found. Please try a different search.")
      }
    } catch (error) {
      alert("Failed to find location. Please try again.")
    }

    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* Current Location Display */}
      {currentLocation && (
        <div className="p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-medium">Current Location</div>
              <div className="text-blue-200 text-sm">
                {currentLocation.name || `${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)}`}
              </div>
            </div>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                size="sm"
                variant="ghost"
                className="text-blue-300 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      <Button onClick={handleGeolocate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MapPin className="h-4 w-4 mr-2" />}
        Use Current Location
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-white/20" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>

      <form onSubmit={handleManualSubmit} className="flex gap-2">
        <Input
          type="text"
          placeholder="Enter city, address, or coordinates"
          value={manualLocation}
          onChange={(e) => setManualLocation(e.target.value)}
          className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
        />
        <Button type="submit" disabled={loading || !manualLocation.trim()} variant="secondary">
          Search
        </Button>
      </form>
    </div>
  )
}
