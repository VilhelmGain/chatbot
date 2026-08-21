import type { NextConfig } from "next";

const basePath = process.env.IS_DEMO === "1" ? "/demo" : "";

const nextConfig: NextConfig = {
  ...(basePath
    ? {
        assetPrefix: "/demo-assets",
        basePath,
        redirects: async () => [
          {
            basePath: false,
            destination: basePath,
            permanent: false,
            source: "/",
          },
        ],
      }
    : {}),
  devIndicators: false,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  experimental: {
    optimizePackageImports: ["framer-motion", "shiki", "streamdown"],
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev; connect-src 'self' https://clerk.com https://*.clerk.com https://*.clerk.accounts.dev https://api.clerk.com; img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://*.clerk.com https://*.clerk.accounts.dev https://*.googleusercontent.com https://*.githubusercontent.com https://*.gravatar.com https://models.dev; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
        source: "/(.*)",
      },
    ];
  },
  images: {
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        hostname: "localhost",
      },
      {
        hostname: "127.0.0.1",
      },
      {
        hostname: "img.clerk.com",
        protocol: "https",
      },
      {
        hostname: "images.clerk.dev",
        protocol: "https",
      },
      {
        hostname: "models.dev",
        protocol: "https",
      },
      {
        hostname: "*.clerk.com",
        protocol: "https",
      },
      {
        hostname: "*.clerk.accounts.dev",
        protocol: "https",
      },
      {
        hostname: "*.googleusercontent.com",
        protocol: "https",
      },
      {
        hostname: "*.githubusercontent.com",
        protocol: "https",
      },
      {
        hostname: "*.gravatar.com",
        protocol: "https",
      },
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
    incomingRequests: false,
  },
  output: "standalone",
  poweredByHeader: false,
  reactCompiler: true,
};

export default nextConfig;
