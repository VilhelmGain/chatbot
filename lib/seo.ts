const DEV_FALLBACK_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/+$/, "");
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(
    /\/+$/,
    ""
  );

  if (appUrl) {
    return `${appUrl}${basePath}`;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is required for production builds so metadata resolves to the public origin."
    );
  }

  return `${DEV_FALLBACK_URL}${basePath}`;
}

export function getCanonicalUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalizedPath, `${getSiteUrl()}/`).toString();
}

export function getMetadataBase(): URL {
  return new URL(`${getSiteUrl()}/`);
}
