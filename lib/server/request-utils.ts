export function getClientIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
}

export function getRequestHints(request: Request) {
  return {
    city: null as string | null,
    country: request.headers.get("cf-ipcountry") ?? null,
    latitude: null as number | null,
    longitude: null as number | null,
  };
}
