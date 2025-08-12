import * as React from "react"
import { cn } from "@/lib/utils"

interface CardProps extends React.ComponentProps<"div"> {
  variant?: "default" | "compact"
}

function Card({ className, variant = "default", ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col rounded-xl border shadow-[0_4px_8px_-4px_rgba(0,0,0,0.08)]",
        variant === "default" && "gap-6 py-6",
        variant === "compact" && "gap-3 py-0",
        className
      )}
      {...props}
    />
  )
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props}
    />
  )
}
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}
interface CardContentProps extends React.ComponentProps<"div"> {
  variant?: "default" | "compact"
}

function CardContent({ className, variant = "default", ...props }: CardContentProps) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        variant === "default" && "px-6",
        variant === "compact" && "px-4",
        className
      )}
      {...props}
    />
  )
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
