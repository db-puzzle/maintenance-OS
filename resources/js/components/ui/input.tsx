import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
  {
    variants: {
      variant: {
        default: [
          "border-input",
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "focus-visible:border-ring focus-visible:ring-ring/10 focus-visible:ring-[3px] focus-visible:bg-input-focus",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        ],
        destructive: [
          "border-destructive",
          "placeholder:text-destructive/60",
          "file:text-destructive",
          "selection:bg-destructive selection:text-destructive-foreground",
          "focus-visible:border-destructive focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 focus-visible:ring-[3px] focus-visible:bg-destructive/5",
        ],
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface InputProps extends React.ComponentProps<"input">, VariantProps<typeof inputVariants> {}

function Input({ className, variant, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Input }
