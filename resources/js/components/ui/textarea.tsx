import * as React from "react"
import { cn } from "@/lib/utils"
export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  view?: boolean;
}
const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, view = false, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground focus-visible:border-ring focus-visible:ring-ring/10 focus-visible:ring-[3px] focus-visible:bg-input-focus disabled:cursor-not-allowed disabled:opacity-50",
          view && "cursor-default opacity-100 text-foreground resize-none",
          className
        )}
        ref={ref}
        readOnly={view}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"
export { Textarea } 