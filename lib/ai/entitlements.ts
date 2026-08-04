import type { UserType } from "@/app/(auth)/auth";

type Entitlements = {
  maxMessagesPerHour: number;
};

function getMaxMessagesPerHour(userType: UserType): number {
  if (userType === "guest") {
    return 10;
  }

  const envValue = process.env.MAX_MESSAGES_PER_HOUR;
  if (envValue === undefined || envValue === "") {
    return 0;
  }

  const parsed = Number.parseInt(envValue, 10);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return parsed;
}

export function getEntitlements(userType: UserType): Entitlements {
  return {
    maxMessagesPerHour: getMaxMessagesPerHour(userType),
  };
}
