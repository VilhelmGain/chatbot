import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";
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

const stixTwoMath = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/stix-two-math-regular.woff2",
  style: "normal",
  variable: "--font-stix-two-math",
  weight: "400",
});

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

const notoSansMath = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/noto-sans-math.woff2",
  variable: "--font-noto-sans-math",
  weight: "400",
});

const inter = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/inter.woff2",
  variable: "--font-inter",
  weight: "400 700",
});

const interTight = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/inter-tight.woff2",
  variable: "--font-inter-tight",
  weight: "400 700",
});

const geist = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/geist.woff2",
  variable: "--font-geist",
  weight: "400 700",
});

const spaceGrotesk = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/space-grotesk.woff2",
  variable: "--font-space-grotesk",
  weight: "400 700",
});

const dmSans = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/dm-sans.woff2",
  variable: "--font-dm-sans",
  weight: "400 700",
});

const roboto = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/roboto.woff2",
  variable: "--font-roboto",
  weight: "400 700",
});

const robotoMono = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/roboto-mono.woff2",
  variable: "--font-roboto-mono",
  weight: "400 700",
});

const cascadiaCode = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/cascadia-code.woff2",
  variable: "--font-cascadia-code",
  weight: "400 700",
});

const geistMono = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  weight: "400 700",
});

const jetbrainsMono = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/jetbrains-mono.woff2",
  variable: "--font-jetbrains-mono",
  weight: "400 700",
});

const firaCode = localFont({
  display: "swap",
  preload: false,
  src: "./fonts/fira-code.woff2",
  variable: "--font-fira-code",
  weight: "400 700",
});

const ibmPlexMono = localFont({
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600" },
    { path: "./fonts/ibm-plex-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-ibm-plex-mono",
});

const spaceMono = localFont({
  display: "swap",
  preload: false,
  src: [
    { path: "./fonts/space-mono-400.woff2", weight: "400" },
    { path: "./fonts/space-mono-700.woff2", weight: "700" },
  ],
  variable: "--font-space-mono",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
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
          nonce={nonce}
        />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: FONT_SCRIPT,
          }}
          nonce={nonce}
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
