"use client"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle } from "lucide-react"

interface StatusIndicatorProps {
  status: "online" | "offline" | "checking"
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  if (status === "checking") return null

  const config = {
    online: {
      icon: CheckCircle,
      className: "border-green-500/50 bg-green-500/10",
      iconClassName: "text-green-500",
      message: "SpaceX API is online - predictions are current",
    },
    offline: {
      icon: XCircle,
      className: "border-red-500/50 bg-red-500/10",
      iconClassName: "text-red-500",
      message: "SpaceX API is offline - using backup data where available",
    },
  }

  const { icon: Icon, className, iconClassName, message } = config[status]

  return (
    <Alert className={`mb-6 ${className}`}>
      <Icon className={`h-4 w-4 ${iconClassName}`} />
      <AlertDescription className="text-white">{message}</AlertDescription>
    </Alert>
  )
}
