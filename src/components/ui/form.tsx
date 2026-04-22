"use client";

import {FormProvider, type UseFormReturn} from "react-hook-form";
import type {ReactNode} from "react";

type FormProps<TFieldValues extends Record<string, unknown>> = UseFormReturn<TFieldValues> & {
  children: ReactNode;
};

export function Form<TFieldValues extends Record<string, unknown>>({children, ...form}: FormProps<TFieldValues>) {
  return <FormProvider {...form}>{children}</FormProvider>;
}
