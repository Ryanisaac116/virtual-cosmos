import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "w-full min-w-0 rounded-[1.15rem] border border-border/70 bg-background/[0.82] px-4 py-3 text-[0.95rem] font-medium tracking-[-0.01em] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-sm transition-[border-color,box-shadow,background-color,transform] outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/75 hover:border-border focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground/80 disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/[0.12] md:text-sm dark:bg-input/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_16px_30px_rgba(2,6,23,0.24)] dark:aria-invalid:border-destructive/70 dark:aria-invalid:ring-destructive/20",
        className
      )}
      {...props} />
  );
}

export { Input }
