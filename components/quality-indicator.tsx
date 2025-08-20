"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react"

interface QualityIndicatorProps {
  quality: {
    quality: "excellent" | "good" | "fair" | "poor"
    factors: string[]
    recommendations: string[]
  }
}

export function QualityIndicator({ quality }: QualityIndicatorProps) {
  const config = {
    excellent: {
      icon: CheckCircle,
      className: "border-green-500/50 bg-green-500/10",
      iconClassName: "text-green-500",
      badgeVariant: "default" as const,
      badgeClassName: "bg-green-600 text-white",
    },
    good: {
      icon: CheckCircle,
      className: "border-blue-500/50 bg-blue-500/10",
      iconClassName: "text-blue-500",
      badgeVariant: "secondary" as const,
      badgeClassName: "bg-blue-600 text-white",
    },
    fair: {
      icon: AlertTriangle,
      className: "border-yellow-500/50 bg-yellow-500/10",
      iconClassName: "text-yellow-500",
      badgeVariant: "outline" as const,
      badgeClassName: "border-yellow-500 text-yellow-400",
    },
    poor: {
      icon: XCircle,
      className: "border-red-500/50 bg-red-500/10",
      iconClassName: "text-red-500",
      badgeVariant: "destructive" as const,
      badgeClassName: "bg-red-600 text-white",
    },
  }

  const { icon: Icon, className, iconClassName, badgeVariant, badgeClassName } = config[quality.quality]

  return (
    <Alert className={className}>
      <Icon className={`h-4 w-4 ${iconClassName}`} />
      <AlertDescription className="text-white">
        <div className="flex items-center gap-2 mb-2">
          <span>Prediction Quality:</span>
          <Badge variant={badgeVariant} className={badgeClassName}>
            {quality.quality.charAt(0).toUpperCase() + quality.quality.slice(1)}
          </Badge>
        </div>

        {quality.factors.length > 0 && (
          <div className="text-sm text-blue-200 mb-2">
            <div className="font-medium mb-1">Factors:</div>
            <ul className="list-disc list-inside space-y-1">
              {quality.factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </div>
        )}

        {quality.recommendations.length > 0 && (
          <div className="text-sm text-blue-200">
            <div className="font-medium mb-1">Recommendations:</div>
            <ul className="list-disc list-inside space-y-1">
              {quality.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  )
}
