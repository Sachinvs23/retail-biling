import dotenv from 'dotenv';

const result = dotenv.config({
  path: '.env.test',
  override: true,
});

if (result.error) {
  throw new Error('Could not load apps/api/.env.test');
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing from .env.test');
}

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, '');

if (
  databaseName !== 'retail_billing_test' ||
  !['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
) {
  throw new Error(
    'Integration tests are allowed to run only against the local retail_billing_test database',
  );
}
