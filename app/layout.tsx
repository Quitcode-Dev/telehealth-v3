import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Telehealth V3",
  description: "MedBridge Connect patient portal",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
