import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex touch-manipulation select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground data-[pressed=true]:bg-primary/90 md:hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground data-[pressed=true]:bg-destructive/90 md:hover:bg-destructive/90",
        outline:
          "border border-input bg-background data-[pressed=true]:bg-accent data-[pressed=true]:text-accent-foreground md:hover:bg-accent md:hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground data-[pressed=true]:bg-secondary/80 md:hover:bg-secondary/80",
        ghost: "data-[pressed=true]:bg-accent data-[pressed=true]:text-accent-foreground md:hover:bg-accent md:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 md:hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        iconMd: "h-12 w-12",
        iconLg: "h-14 w-14",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    disabled,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
    onLostPointerCapture,
    onClick,
    onBlur,
    ...props
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    const [isPressed, setIsPressed] = React.useState(false)
    const clearPressed = () => setIsPressed(false)

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled}
        data-pressed={isPressed ? "true" : undefined}
        onPointerDown={(event: React.PointerEvent<HTMLButtonElement>) => {
          if (!disabled && event.isPrimary && event.button === 0) setIsPressed(true)
          onPointerDown?.(event)
        }}
        onPointerUp={(event: React.PointerEvent<HTMLButtonElement>) => {
          clearPressed()
          onPointerUp?.(event)
        }}
        onPointerCancel={(event: React.PointerEvent<HTMLButtonElement>) => {
          clearPressed()
          onPointerCancel?.(event)
        }}
        onPointerLeave={(event: React.PointerEvent<HTMLButtonElement>) => {
          clearPressed()
          onPointerLeave?.(event)
        }}
        onLostPointerCapture={(event: React.PointerEvent<HTMLButtonElement>) => {
          clearPressed()
          onLostPointerCapture?.(event)
        }}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          clearPressed()
          onClick?.(event)
        }}
        onBlur={(event: React.FocusEvent<HTMLButtonElement>) => {
          clearPressed()
          onBlur?.(event)
        }}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
