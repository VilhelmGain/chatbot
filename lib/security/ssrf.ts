import { lookup } from "node:dns/promises";
import { isTestEnvironment } from "@/lib/constants";

const BLOCKED_HOSTS = new Set([
  "localhost",
  "0.0.0.0",
  "::1",
  "0:0:0:0:0:0:0:1",
]);

function isPrivateIp(ip: string): boolean {
  const normalized = ip.toLowerCase().replace(/^::ffff:/, "");

  if (normalized.includes(":")) {
    return (
      normalized === "::" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized === "::1"
    );
  }

  const parts = normalized.split(".").map(Number);
  if (
    parts.length !== 4 ||
    parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)
  ) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

export async function assertPublicUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch (error) {
    throw new Error("Invalid URL.", { cause: error });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs are supported.");
  }

  if (isTestEnvironment) {
    return url;
  }

  if (BLOCKED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      "This URL points to a local or reserved address and cannot be fetched."
    );
  }

  let address: string;
  try {
    ({ address } = await lookup(url.hostname));
  } catch (error) {
    throw new Error(
      "This URL points to a local or reserved address and cannot be fetched.",
      { cause: error }
    );
  }

  if (isPrivateIp(address)) {
    throw new Error(
      "This URL points to a local or reserved address and cannot be fetched."
    );
  }

  return url;
}

export { isPrivateIp };
