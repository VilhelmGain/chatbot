#!/bin/sh
set -e
trap 'rm -f /tmp/migrate.mjs' EXIT

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "ERROR: ENCRYPTION_KEY is not set. It is required to encrypt provider API keys."
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

echo "Running database migrations..."
# Write migration script to a temp file to avoid shell quoting issues with POSTGRES_URL
cat > /tmp/migrate.mjs <<'MIGRATE_EOF'
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function waitForPostgres(url, maxAttempts = 30) {
  console.log("Waiting for PostgreSQL...");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let connection;
    try {
      connection = postgres(url, { max: 1 });
      await connection`SELECT 1`;
      await connection.end();
      console.log("PostgreSQL is ready!");
      return true;
    } catch (err) {
      try { if (connection) await connection.end(); } catch {}
      console.log(`Attempt ${attempt}/${maxAttempts}: PostgreSQL not ready, waiting...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  console.error("PostgreSQL did not become ready in time");
  return false;
}

if (!process.env.POSTGRES_URL) {
  console.log("POSTGRES_URL not defined, skipping migrations");
  process.exit(0);
}

const isReady = await waitForPostgres(process.env.POSTGRES_URL);
if (!isReady) {
  process.exit(1);
}

let _conn;
try {
  _conn = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(_conn);
  console.log("Running migrations...");
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  console.log("Migrations complete");
} finally {
  try { if (_conn) await _conn.end(); } catch {}
}
process.exit(0);
MIGRATE_EOF
node /tmp/migrate.mjs
echo "Starting application..."
exec node server.js
