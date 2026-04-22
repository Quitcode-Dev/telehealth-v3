import * as React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const baseClassName =
  "flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground disabled:cursor-not-allowed disabled:opacity-50";

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={[baseClassName, className].filter(Boolean).join(" ")} {...props} />;
});
