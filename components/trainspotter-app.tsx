"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Satellite, Clock, Settings, Globe } from "lucide-react"
import { LocationPicker } from "@/components/location-picker"
import { PassList } from "@/components/pass-list"
import { StatusIndicator } from "@/components/status-indicator"
import { QualityIndicator } from "@/components/quality-indicator"
import { SettingsPanel } from "@/components/settings-panel"
import { SatelliteMap } from "@/components/satellite-map"
import { PassVisualization } from "@/components/pass-visualization"
import { CardGenerator } from "@/components/card-generator"
import { GlobalVisibility } from "@/components/global-visibility"
import type { UserLocation, Pass, PredictionWeights } from "@/lib/types"
import { DEFAULT_WEIGHTS } from "@/lib/constants"

interface PredictionResponse {
  passes: Pass[]
  quality: {
    quality: "excellent" | "good" | "fair" | "poor"
    factors: string[]
    recommendations: string[]
  }
  location: string
  timestamp: string
}

// New component for detailed pass information
function PassDetails({ passes, location }: { passes: Pass[]; location: UserLocation }) {
  return (
    <div className="space-y-4">
      {passes.map((pass, index) => (
        <div key={`${pass.satId}-${pass.start.getTime()}`} className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="text-white font-medium">
                {pass.launchName || "Starlink Mission"} - Pass #{index + 1}
              </h4>
              <p className="text-blue-200 text-sm">
                {pass.start.toLocaleDateString()} • Score: {pass.score.toFixed(1)}
              </p>
            </div>
            {pass.boosterInfo && (
              <div className="text-right text-sm text-blue-300">
                <div>Flight #{pass.boosterInfo.flightNumber}</div>
                <div>{pass.boosterInfo.landingType}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-blue-300 font-medium">Start Time</div>
              <div className="text-white">{pass.start.toLocaleTimeString()}</div>
            </div>
            <div>
              <div className="text-blue-300 font-medium">Peak Time</div>
              <div className="text-white">{pass.peak.toLocaleTimeString()}</div>
            </div>
            <div>
              <div className="text-blue-300 font-medium">Duration</div>
              <div className="text-white">{Math.round((pass.end.getTime() - pass.start.getTime()) / 60000)}m</div>
            </div>
            <div>
              <div className="text-blue-300 font-medium">Max Elevation</div>
              <div className="text-white">{pass.maxElDeg.toFixed(0)}°</div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <div className="text-blue-300">
                Path: {pass.azStart.toFixed(0)}° → {pass.azEnd.toFixed(0)}°
              </div>
              <div className="text-blue-300">Phase: {pass.phaseAngleDeg.toFixed(0)}°</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function TrainspotterApp() {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [passes, setPasses] = useState<Pass[]>([])
  const [loading, setLoading] = useState(false)
  const [apiStatus, setApiStatus] = useState<"online" | "offline" | "checking">("checking")
  const [predictionQuality, setPredictionQuality] = useState<PredictionResponse["quality"] | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [weights, setWeights] = useState<PredictionWeights>(DEFAULT_WEIGHTS)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null)
  const [viewMode, setViewMode] = useState<"local" | "global">("global")

  useEffect(() => {
    // Check API status on load
    checkApiStatus()
  }, [])

  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/status")
      const data = await response.json()
      setApiStatus(data.status)
    } catch (error) {
      setApiStatus("offline")
    }
  }

  const handleLocationChange = async (newLocation: UserLocation) => {
    setLocation(newLocation)
    setLoading(true)
    setError(null)
    setSelectedPass(null)

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: newLocation, weights }),
      })

      if (response.ok) {
        const data: PredictionResponse = await response.json()
        setPasses(data.passes)
        setPredictionQuality(data.quality)
        setLastUpdated(new Date())
      } else {
        const errorData = await response.json()
        setError(errorData.error || "Failed to fetch predictions")
      }
    } catch (error) {
      console.error("Failed to fetch predictions:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleWeightsChange = async (newWeights: PredictionWeights) => {
    setWeights(newWeights)

    // Recalculate predictions if we have a location
    if (location) {
      await handleLocationChange(location)
    }
  }

  const refreshPredictions = async () => {
    if (location) {
      await handleLocationChange(location)
    }
  }

  const handleGlobalLocationSelect = (lat: number, lon: number, name: string) => {
    const newLocation: UserLocation = {
      latitude: lat,
      longitude: lon,
      name: name,
      timezone: "UTC", // Will be updated by the location picker
    }
    setViewMode("local")
    handleLocationChange(newLocation)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Satellite className="h-8 w-8 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Trainspotter</h1>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="ml-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title="Settings"
            >
              <Settings className="h-5 w-5 text-white" />
            </button>
          </div>
          <p className="text-blue-200 text-lg max-w-2xl mx-auto">
            {viewMode === "global"
              ? "See where Starlink satellite trains are currently visible worldwide"
              : "Predict when fresh Starlink satellite trains will be visible from your location"}
          </p>
          {lastUpdated && (
            <p className="text-blue-300 text-sm mt-2">Last updated: {lastUpdated.toLocaleTimeString()}</p>
          )}
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex justify-center mb-6">
          <div className="flex bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setViewMode("global")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "global" ? "bg-blue-500 text-white" : "text-blue-200 hover:text-white hover:bg-white/10"
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Global View
            </button>
            <button
              onClick={() => setViewMode("local")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "local" ? "bg-blue-500 text-white" : "text-blue-200 hover:text-white hover:bg-white/10"
              }`}
            >
              <MapPin className="h-4 w-4 inline mr-2" />
              My Location
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="mb-6">
            <SettingsPanel
              weights={weights}
              onWeightsChange={handleWeightsChange}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}

        {/* Status Indicators */}
        <div className="space-y-4 mb-6">
          <StatusIndicator status={apiStatus} />
          {predictionQuality && viewMode === "local" && <QualityIndicator quality={predictionQuality} />}
        </div>

        {/* Error Display */}
        {error && viewMode === "local" && (
          <Card className="mb-6 bg-red-500/10 border-red-500/50">
            <CardContent className="p-4">
              <p className="text-red-200">{error}</p>
            </CardContent>
          </Card>
        )}

        {viewMode === "global" ? (
          /* Global View */
          <div className="max-w-4xl mx-auto">
            <GlobalVisibility onLocationSelect={handleGlobalLocationSelect} />
          </div>
        ) : (
          /* Local View */
          <>
            {/* Main Content */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Location & Controls */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MapPin className="h-5 w-5" />
                    Your Location
                  </CardTitle>
                  <CardDescription className="text-blue-200">
                    Set your location to see upcoming Starlink train passes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LocationPicker
                    onLocationChange={handleLocationChange}
                    currentLocation={location}
                    onRefresh={refreshPredictions}
                  />
                </CardContent>
              </Card>

              {/* Predictions */}
              <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Clock className="h-5 w-5" />
                    Upcoming Trains
                  </CardTitle>
                  <CardDescription className="text-blue-200">Top predicted Starlink train passes</CardDescription>
                </CardHeader>
                <CardContent>
                  {apiStatus === "offline" ? (
                    <div className="text-center py-8 text-yellow-200">
                      SpaceX API is currently unavailable. Please try again later.
                    </div>
                  ) : location ? (
                    <PassList passes={passes} loading={loading} location={location} onRefresh={refreshPredictions} />
                  ) : (
                    <div className="text-center py-8 text-blue-200">Set your location to see predictions</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Satellite Map and Pass Visualization */}
            {passes.length > 0 && location && (
              <div className="mt-6 grid gap-6 lg:grid-cols-2">
                {/* Satellite Map */}
                <SatelliteMap
                  passes={passes}
                  location={location}
                  selectedPass={selectedPass}
                  onPassSelect={setSelectedPass}
                />

                {/* Pass Visualization */}
                <PassVisualization
                  passes={passes}
                  location={location}
                  selectedPass={selectedPass}
                  onPassSelect={setSelectedPass}
                />
              </div>
            )}

            {/* Shareable Cards */}
            {passes.length > 0 && location && (
              <div className="mt-6">
                <CardGenerator passes={passes} location={location} />
              </div>
            )}

            {/* Full Width Pass Details */}
            {passes.length > 0 && location && (
              <div className="mt-6">
                <Card className="bg-white/10 backdrop-blur-sm border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Pass Details</CardTitle>
                    <CardDescription className="text-blue-200">
                      Detailed information about upcoming satellite passes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PassDetails passes={passes.slice(0, 5)} location={location} />
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
