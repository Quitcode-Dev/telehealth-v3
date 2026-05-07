import Link from "next/link";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/src/components/ui/card";

type DemoExperienceCardProps = {
  title: string;
  description: string;
  highlights: string[];
  actions?: Array<{
    href: string;
    label: string;
  }>;
};

export function DemoExperienceCard({title, description, highlights, actions = []}: DemoExperienceCardProps) {
  return (
    <Card className="border-dashed bg-muted/40">
      <CardHeader className="gap-3">
        <span className="inline-flex w-fit items-center rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
          Demo — read-only simulation
        </span>
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm text-muted-foreground">
          {highlights.map((highlight) => (
            <li key={highlight} className="rounded-md bg-background px-3 py-2">
              {highlight}
            </li>
          ))}
        </ul>
        {actions.length > 0 ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              >
                {action.label}
              </Link>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
