import type {HTMLAttributes} from "react";

type CardComponentProps = HTMLAttributes<HTMLDivElement>;

const cardBaseClassName = "rounded-lg border border-border bg-card text-card-foreground shadow-sm";

export function Card({className, ...props}: CardComponentProps) {
  return <div className={[cardBaseClassName, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardHeader({className, ...props}: CardComponentProps) {
  return <div className={["flex flex-col space-y-1.5 p-6", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardTitle({className, ...props}: CardComponentProps) {
  return <h1 className={["text-2xl font-semibold leading-none tracking-tight", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardDescription({className, ...props}: CardComponentProps) {
  return <p className={["text-sm text-muted-foreground", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardContent({className, ...props}: CardComponentProps) {
  return <div className={["p-6 pt-0", className].filter(Boolean).join(" ")} {...props} />;
}
