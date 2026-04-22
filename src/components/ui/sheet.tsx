"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type {ComponentPropsWithoutRef, ElementRef} from "react";
import {forwardRef} from "react";

function classNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;

const SheetOverlay = forwardRef<
  ElementRef<typeof Dialog.Overlay>,
  ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({className, ...props}, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={classNames("fixed inset-0 z-50 bg-black/50", className)}
    {...props}
  />
));
SheetOverlay.displayName = Dialog.Overlay.displayName;

type SheetContentProps = ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: "top" | "bottom" | "left" | "right";
};

const sideStyles: Record<NonNullable<SheetContentProps["side"]>, string> = {
  top: "inset-x-0 top-0 border-b",
  bottom: "inset-x-0 bottom-0 border-t",
  left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
  right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
};

const SheetContent = forwardRef<ElementRef<typeof Dialog.Content>, SheetContentProps>(
  ({className, children, side = "right", ...props}, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        ref={ref}
        className={classNames(
          "fixed z-50 bg-background p-6 shadow-lg transition",
          sideStyles[side],
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </SheetPortal>
  ),
);
SheetContent.displayName = Dialog.Content.displayName;

const SheetTitle = Dialog.Title;
const SheetDescription = Dialog.Description;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetTitle,
  SheetDescription,
};
