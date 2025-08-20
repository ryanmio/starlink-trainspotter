"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { X, RotateCcw } from "lucide-react"
import type { PredictionWeights } from "@/lib/types"
import { DEFAULT_WEIGHTS } from "@/lib/constants"

interface SettingsPanelProps {
  weights: PredictionWeights
  onWeightsChange: (weights: PredictionWeights) => void
  onClose: () => void
}

export function SettingsPanel({ weights, onWeightsChange, onClose }: SettingsPanelProps) {
  const [localWeights, setLocalWeights] = useState(weights)

  const handleWeightChange = (key: keyof PredictionWeights, value: number[]) => {
    const newWeights = { ...localWeights, [key]: value[0] }
    setLocalWeights(newWeights)
  }

  const handleApply = () => {
    onWeightsChange(localWeights)
    onClose()
  }

  const handleReset = () => {
    setLocalWeights(DEFAULT_WEIGHTS)
  }

  const totalWeight = Object.values(localWeights).reduce((sum, weight) => sum + weight, 0)

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Prediction Settings</CardTitle>
            <CardDescription className="text-blue-200">
              Adjust scoring weights for satellite pass predictions
            </CardDescription>
          </div>
          <Button onClick={onClose} size="sm" variant="ghost" className="text-white hover:bg-white/10">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-white">Days Since Deploy (w1): {localWeights.w1.toFixed(2)}</Label>
            <p className="text-xs text-blue-300 mb-2">Higher weight favors recently launched satellites</p>
            <Slider
              value={[localWeights.w1]}
              onValueChange={(value) => handleWeightChange("w1", value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-white">Phase Brightness (w2): {localWeights.w2.toFixed(2)}</Label>
            <p className="text-xs text-blue-300 mb-2">Higher weight favors brighter satellite appearances</p>
            <Slider
              value={[localWeights.w2]}
              onValueChange={(value) => handleWeightChange("w2", value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-white">Peak Elevation (w3): {localWeights.w3.toFixed(2)}</Label>
            <p className="text-xs text-blue-300 mb-2">Higher weight favors passes higher in the sky</p>
            <Slider
              value={[localWeights.w3]}
              onValueChange={(value) => handleWeightChange("w3", value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
          </div>

          <div>
            <Label className="text-white">Twilight Bonus (w4): {localWeights.w4.toFixed(2)}</Label>
            <p className="text-xs text-blue-300 mb-2">Higher weight favors passes during optimal viewing times</p>
            <Slider
              value={[localWeights.w4]}
              onValueChange={(value) => handleWeightChange("w4", value)}
              max={1}
              min={0}
              step={0.05}
              className="w-full"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-white/20">
          <div className="flex items-center justify-between text-sm text-blue-200 mb-4">
            <span>Total Weight:</span>
            <span className={totalWeight > 1.2 ? "text-yellow-400" : "text-white"}>{totalWeight.toFixed(2)}</span>
          </div>

          {totalWeight > 1.2 && (
            <p className="text-xs text-yellow-400 mb-4">
              Warning: Total weight is high. Consider reducing some values for balanced scoring.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleReset}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleApply} size="sm" className="bg-blue-600 hover:bg-blue-700 flex-1">
              Apply Changes
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
