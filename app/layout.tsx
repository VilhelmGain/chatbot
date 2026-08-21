import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Suspense } from "react";
import { NonceScripts } from "@/components/nonce-scripts";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isTestEnvironmentNow } from "@/lib/constants";
import { getCanonicalUrl, getMetadataBase } from "@/lib/seo";

import "./globals.css";

export const metadata: Metadata = {
  alternates: {
    canonical: getCanonicalUrl("/"),
  },
  applicationName: "Visbyr Chat",
  description:
    "Visbyr Chat is a bring-your-own-key AI chat app for custom OpenAI-compatible and Anthropic-compatible providers.",
  metadataBase: getMetadataBase(),
  openGraph: {
    description:
      "Visbyr Chat is a bring-your-own-key AI chat app for custom OpenAI-compatible and Anthropic-compatible providers.",
    locale: "en_US",
    siteName: "Visbyr Chat",
    title: "Visbyr Chat",
    type: "website",
    url: getCanonicalUrl("/"),
  },
  title: {
    default: "Visbyr Chat",
    template: "%s | Visbyr Chat",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "Visbyr Chat is a bring-your-own-key AI chat app for custom OpenAI-compatible and Anthropic-compatible providers.",
    title: "Visbyr Chat",
  },
};

export const viewport: Viewport = {
  initialScale: 1,
  interactiveWidget: "resizes-content",
  viewportFit: "cover",
  width: "device-width",
};

const sora = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/sora.woff2",
  variable: "--font-sora",
  weight: "400 700",
});

const montserrat = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/montserrat.woff2",
  variable: "--font-montserrat",
  weight: "400 700",
});

const manrope = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/manrope.woff2",
  variable: "--font-manrope",
  weight: "400 700",
});

const geistMono = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  weight: "400 700",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${sora.variable} ${montserrat.variable} ${manrope.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <Suspense fallback={null}>
          <NonceScripts />
        </Suspense>
      </head>
      <body className="antialiased">
        <div aria-hidden className="bg-aurora" />
        <div aria-hidden className="bg-noise" />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {isTestEnvironmentNow() ? (
            <TooltipProvider>{children}</TooltipProvider>
          ) : (
            <ClerkProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </ClerkProvider>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
