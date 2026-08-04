#!/bin/sh
set -e

if [ -z "$AUTH_SECRET" ]; then
  echo "ERROR: AUTH_SECRET is not set. NextAuth requires a secret in production."
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

echo "Running database migrations..."
node -e "
const { config } = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

(async () => {
  if (!process.env.POSTGRES_URL) {
    console.log('POSTGRES_URL not defined, skipping migrations');
    process.exit(0);
  }
  const connection = postgres(process.env.POSTGRES_URL, { max: 1 });
  const db = drizzle(connection);
  console.log('Running migrations...');
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  console.log('Migrations complete');
  process.exit(0);
})().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
" || echo "Migration skipped (non-fatal)"
echo "Starting application..."
exec node server.js
