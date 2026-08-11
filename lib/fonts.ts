export type FontOption = { id: string; label: string; stack: string };

const SANS_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const MONO_FALLBACK =
  'ui-monospace, "SF Mono", "Cascadia Code", "Fira Code", "JetBrains Mono", monospace';

export const SANS_FONTS: readonly FontOption[] = [
  {
    id: "montserrat",
    label: "Montserrat",
    stack: `var(--font-montserrat), ${SANS_FALLBACK}`,
  },
  {
    id: "sora",
    label: "Sora",
    stack: `var(--font-sora), ${SANS_FALLBACK}`,
  },
  {
    id: "manrope",
    label: "Manrope",
    stack: `var(--font-manrope), ${SANS_FALLBACK}`,
  },
  {
    id: "inter",
    label: "Inter",
    stack: `var(--font-inter), ${SANS_FALLBACK}`,
  },
  {
    id: "geist",
    label: "Geist",
    stack: `var(--font-geist), ${SANS_FALLBACK}`,
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    stack: `var(--font-space-grotesk), ${SANS_FALLBACK}`,
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    stack: `var(--font-dm-sans), ${SANS_FALLBACK}`,
  },
];

export const MONO_FONTS: readonly FontOption[] = [
  {
    id: "geist-mono",
    label: "Geist Mono",
    stack: `var(--font-geist-mono), ${MONO_FALLBACK}`,
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: `var(--font-jetbrains-mono), ${MONO_FALLBACK}`,
  },
  {
    id: "fira-code",
    label: "Fira Code",
    stack: `var(--font-fira-code), ${MONO_FALLBACK}`,
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    stack: `var(--font-ibm-plex-mono), ${MONO_FALLBACK}`,
  },
  {
    id: "space-mono",
    label: "Space Mono",
    stack: `var(--font-space-mono), ${MONO_FALLBACK}`,
  },
  {
    id: "system",
    label: "System",
    stack: MONO_FALLBACK,
  },
];

export type FontRole = "body" | "heading" | "label" | "code";

export type FontRoleConfig = {
  label: string;
  description: string;
  cookieName: string;
  cssVar: string;
  defaultId: string;
  fonts: readonly FontOption[];
};

export const FONT_ROLES: Record<FontRole, FontRoleConfig> = {
  body: {
    cookieName: "font-body",
    cssVar: "--app-font-body",
    defaultId: "montserrat",
    description: "Main interface and body text.",
    fonts: SANS_FONTS,
    label: "Body font",
  },
  code: {
    cookieName: "font-mono",
    cssVar: "--font-mono",
    defaultId: "geist-mono",
    description: "Monospace font used in code blocks.",
    fonts: MONO_FONTS,
    label: "Code font",
  },
  heading: {
    cookieName: "font-heading",
    cssVar: "--app-font-heading",
    defaultId: "sora",
    description: "Headings and titles.",
    fonts: SANS_FONTS,
    label: "Heading font",
  },
  label: {
    cookieName: "font-label",
    cssVar: "--app-font-label",
    defaultId: "manrope",
    description: "Labels and small UI text.",
    fonts: SANS_FONTS,
    label: "Label font",
  },
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: needed for client-side cookie setting
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}`;
}

export function parseFontId(role: FontRole, value: string | undefined): string {
  const config = FONT_ROLES[role];
  if (
    value &&
    (config.fonts as readonly FontOption[]).some((font) => font.id === value)
  ) {
    return value;
  }
  return config.defaultId;
}

export function getFontId(role: FontRole): string {
  if (typeof document === "undefined") {
    return FONT_ROLES[role].defaultId;
  }
  return parseFontId(role, readCookie(FONT_ROLES[role].cookieName));
}

export function getFontStack(role: FontRole, id: string): string {
  const config = FONT_ROLES[role];
  return (
    config.fonts.find((font) => font.id === id)?.stack ??
    config.fonts.find((font) => font.id === config.defaultId)?.stack ??
    config.fonts[0].stack
  );
}

export function setFontId(role: FontRole, id: string) {
  const config = FONT_ROLES[role];
  const fontId = parseFontId(role, id);
  if (typeof document !== "undefined") {
    writeCookie(config.cookieName, fontId);
    document.documentElement.style.setProperty(
      config.cssVar,
      getFontStack(role, fontId)
    );
  }
  notifyFontListeners();
}

const fontListeners = new Set<() => void>();

function notifyFontListeners() {
  for (const listener of fontListeners) {
    listener();
  }
}

export function subscribeFonts(onStoreChange: () => void) {
  fontListeners.add(onStoreChange);
  return () => {
    fontListeners.delete(onStoreChange);
  };
}
