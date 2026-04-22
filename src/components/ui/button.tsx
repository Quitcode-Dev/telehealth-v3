import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const baseClassName =
  "inline-flex h-10 items-center justify-center rounded-md bg-foreground px-4 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={[baseClassName, className].filter(Boolean).join(" ")} {...props} />;
});
