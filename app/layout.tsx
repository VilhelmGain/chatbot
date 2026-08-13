import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import {
  Cascadia_Code,
  DM_Sans,
  Fira_Code,
  Geist,
  Geist_Mono,
  IBM_Plex_Mono,
  Inter,
  Inter_Tight,
  JetBrains_Mono,
  Manrope,
  Montserrat,
  Noto_Sans_Math,
  Roboto,
  Roboto_Mono,
  Sora,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isTestEnvironment } from "@/lib/constants";
import { FONT_ROLES } from "@/lib/fonts";
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

const sora = Sora({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-sora",
  weight: ["400", "500", "600", "700"],
});

const montserrat = Montserrat({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

const notoSansMath = Noto_Sans_Math({
  display: "swap",
  preload: false,
  subsets: ["cyrillic", "latin", "math"],
  variable: "--font-noto-sans-math",
  weight: "400",
});

const stixTwoMath = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/stix-two-math-regular.woff2",
  style: "normal",
  variable: "--font-stix-two-math",
  weight: "400",
});

const inter = Inter({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

const interTight = Inter_Tight({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-inter-tight",
  weight: ["400", "500", "600", "700"],
});

const geist = Geist({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const dmSans = DM_Sans({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const roboto = Roboto({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-roboto",
  weight: ["400", "500", "600", "700"],
});

const robotoMono = Roboto_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  weight: ["400", "500", "600", "700"],
});

const cascadiaCode = Cascadia_Code({
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
  preload: false,
  subsets: ["latin"],
  variable: "--font-cascadia-code",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600", "700"],
});

const firaCode = Fira_Code({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-fira-code",
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  display: "swap",
  preload: false,
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(190deg 18% 8%)";
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

const FONT_SCRIPT = `\
(function() {
  var roles = ${JSON.stringify(FONT_ROLES).replace(/</g, "\\u003c")};
  function readCookie(name) {
    var match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : undefined;
  }
  var html = document.documentElement;
  for (var roleKey in roles) {
    var role = roles[roleKey];
    var id = readCookie(role.cookieName);
    var font = null;
    for (var i = 0; i < role.fonts.length; i++) {
      if (role.fonts[i].id === id) font = role.fonts[i];
      if (!font && role.fonts[i].id === role.defaultId) font = role.fonts[i];
    }
    if (font) {
      html.style.setProperty(role.cssVar, font.stack);
      if (role.cssVarItalic) {
        html.style.setProperty(role.cssVarItalic, font.italicStack || font.stack);
      }
    }
  }
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${sora.variable} ${montserrat.variable} ${manrope.variable} ${inter.variable} ${interTight.variable} ${geist.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${roboto.variable} ${robotoMono.variable} ${cascadiaCode.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${firaCode.variable} ${ibmPlexMono.variable} ${spaceMono.variable} ${notoSansMath.variable} ${stixTwoMath.variable}`}
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
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: FONT_SCRIPT,
          }}
        />
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
