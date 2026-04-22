import {Footer} from "./Footer";
import {Header} from "./Header";
import {Sidebar} from "./Sidebar";
import {Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger} from "@/src/components/ui/sheet";
import type {ReactNode} from "react";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({children}: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Sheet>
        <Header
          mobileMenuTrigger={
            <SheetTrigger asChild>
              <button
                type="button"
                className="rounded-md border border-border px-2 py-1 text-sm lg:hidden"
                aria-label="Open navigation menu"
              >
                ☰
              </button>
            </SheetTrigger>
          }
        />

        <div className="flex flex-1">
          <Sidebar className="hidden w-64 border-r border-border lg:block" />

          <SheetContent side="left" className="p-0 lg:hidden">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">Select a destination from the main menu.</SheetDescription>
            <Sidebar className="h-full" />
          </SheetContent>
          <main className="flex-1 p-6">{children}</main>
        </div>
      </Sheet>

      <Footer />
    </div>
  );
}
