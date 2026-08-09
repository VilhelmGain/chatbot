import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isTestEnvironment } from "@/lib/constants";
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
  viewportFit: "cover",
  width: "device-width",
};

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

const geistMono = Geist_Mono({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {isTestEnvironment ? (
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
