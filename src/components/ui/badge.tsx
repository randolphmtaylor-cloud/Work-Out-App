import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900",
        secondary:
          "border-transparent bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
        outline:
          "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300",
        accent:
          "border-transparent bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300",
        success:
          "border-transparent bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300",
        warning:
          "border-transparent bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
        destructive:
          "border-transparent bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300",
        push:
          "border-transparent bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300",
        pull:
          "border-transparent bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
        legs:
          "border-transparent bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300",
        core:
          "border-transparent bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
