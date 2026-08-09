#!/bin/sh
set -e

if [ -z "$ENCRYPTION_KEY" ]; then
  echo "ERROR: ENCRYPTION_KEY is not set. It is required to encrypt provider API keys."
  echo "Generate one with: openssl rand -base64 32"
  exit 1
fi

echo "Running database migrations..."
node -e "
const { config } = require('dotenv');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

async function waitForPostgres(url, maxAttempts = 30) {
  console.log('Waiting for PostgreSQL...');
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const connection = postgres(url, { max: 1 });
      await connection\`SELECT 1\`;
      await connection.end();
      console.log('PostgreSQL is ready!');
      return true;
    } catch (err) {
      console.log(\`Attempt \${attempt}/\${maxAttempts}: PostgreSQL not ready, waiting...\`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.error('PostgreSQL did not become ready in time');
  return false;
}

(async () => {
  if (!process.env.POSTGRES_URL) {
    console.log('POSTGRES_URL not defined, skipping migrations');
    process.exit(0);
  }
  
  const isReady = await waitForPostgres(process.env.POSTGRES_URL);
  if (!isReady) {
    process.exit(1);
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
"
echo "Starting application..."
exec node server.js
