import { cleanEnv } from 'envalid';
import { bool, port, str, num } from 'envalid/dist/validators';

const env = cleanEnv(process.env, {
  PORT: port(),
  DATABASE_HOST: str(),
  DATABASE_PORT: num(),
  DATABASE_USER: str(),
  DATABASE_PASSWORD: str(),
  DATABASE_NAME: str(),
  DATABASE_SYNC: bool({ default: false }),
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  DEV: bool(),
  CLIENT_URL: str(),
  GOOGLE_OAUTH_CLIENT_ID: str(),
  GOOGLE_OAUTH_CLIENT_SECRET: str(),
  GOOGLE_OAUTH_REDIRECT_URL: str(),
  MOMO_PARTNER_CODE: str({ default: '' }),
  MOMO_ACCESS_KEY: str({ default: '' }),
  MOMO_SECRET_KEY: str({ default: '' }),
  MOMO_RETURN_URL: str({ default: '' }),
  MOMO_NOTIFY_URL: str({ default: '' }),
  MOMO_ENDPOINT: str({ default: '' }),
  PAYMENT_MOCK: bool({ default: false }),
  PLATFORM_FEE_RATE: num({ default: 0.2 }),
  YOUTUBE_STT_ENABLED: bool({ default: false }),
  YOUTUBE_STT_ENDPOINT: str({ default: '' }),
  YOUTUBE_STT_MODEL: str({ default: 'large-v3' }),
  YOUTUBE_STT_LANGUAGE: str({ default: 'vi' }),
  YOUTUBE_STT_TIMEOUT_MS: num({ default: 120000 }),
  YOUTUBE_STT_MAX_RETRIES: num({ default: 2 }),
});

export default env;
