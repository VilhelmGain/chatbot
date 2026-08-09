type Entitlements = {
  maxMessagesPerHour: number;
};

function getMaxMessagesPerHour(): number {
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

export function getEntitlements(): Entitlements {
  return {
    maxMessagesPerHour: getMaxMessagesPerHour(),
  };
}
