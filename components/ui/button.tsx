import { Slot } from "radix-ui";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { tv, type VariantProps } from "tailwind-variants";

import { cn } from "@/lib/utils";

export const buttonStyles = tv({
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium",
    "transition-colors duration-150 select-none",
    "disabled:pointer-events-none disabled:opacity-40",
    "[&_svg]:size-3.5 [&_svg]:shrink-0",
  ],
  variants: {
    variant: {
      primary: "bg-fg text-inverse hover:bg-fg/88",
      secondary: "bg-raised text-fg shadow-[inset_0_0_0_1px_var(--line-strong)] hover:bg-overlay",
      ghost: "text-muted hover:bg-hover hover:text-fg",
      danger: "bg-err/12 text-err hover:bg-err/20",
    },
    size: {
      sm: "h-7 px-2.5 text-xs",
      md: "h-8 px-3 text-sm",
      icon: "size-8",
      "icon-sm": "size-7",
    },
  },
  defaultVariants: { variant: "secondary", size: "md" },
});

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonStyles> & { asChild?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, type = "button", ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(buttonStyles({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
