"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Share2, Download } from "lucide-react"
import { ShareableCard } from "@/components/shareable-card"
import type { Pass, UserLocation } from "@/lib/types"

interface CardGeneratorProps {
  passes: Pass[]
  location: UserLocation
}

export function CardGenerator({ passes, location }: CardGeneratorProps) {
  const [selectedPass, setSelectedPass] = useState<Pass | null>(null)
  const [showCard, setShowCard] = useState(false)

  const handleGenerateCard = (pass: Pass) => {
    setSelectedPass(pass)
    setShowCard(true)
  }

  const handleCloseCard = () => {
    setShowCard(false)
    setSelectedPass(null)
  }

  if (passes.length === 0) {
    return (
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardContent className="p-8 text-center">
          <Share2 className="h-8 w-8 mx-auto mb-2 text-blue-400 opacity-50" />
          <p className="text-blue-200">No passes available for sharing</p>
        </CardContent>
      </Card>
    )
  }

  if (showCard && selectedPass) {
    return <ShareableCard pass={selectedPass} location={location} onClose={handleCloseCard} />
  }

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Share2 className="h-5 w-5" />
          Share Your Sightings
        </CardTitle>
        <CardDescription className="text-blue-200">
          Generate beautiful shareable cards for your Starlink train sightings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {passes.slice(0, 5).map((pass, index) => (
            <div
              key={`${pass.satId}-${pass.start.getTime()}`}
              className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="bg-blue-600/20 text-blue-200">
                    #{index + 1}
                  </Badge>
                  <span className="text-white font-medium">{pass.launchName || "Starlink Mission"}</span>
                  <Badge variant="outline" className="border-green-400/50 text-green-400">
                    {pass.score.toFixed(1)}
                  </Badge>
                </div>
                <div className="text-sm text-blue-200">
                  {pass.start.toLocaleDateString()} at {pass.start.toLocaleTimeString()} • Max elevation:{" "}
                  {pass.maxElDeg.toFixed(0)}°
                </div>
                {pass.boosterInfo && (
                  <div className="text-xs text-blue-300 mt-1">
                    Booster flight #{pass.boosterInfo.flightNumber} • {pass.boosterInfo.landingType}
                  </div>
                )}
              </div>
              <Button onClick={() => handleGenerateCard(pass)} size="sm" className="bg-blue-600 hover:bg-blue-700 ml-4">
                <Download className="h-4 w-4 mr-2" />
                Create Card
              </Button>
            </div>
          ))}

          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="text-sm text-blue-200">
              <strong className="text-white">Tip:</strong> Cards work offline after generation and include all the
              details needed to share your sighting with others.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
