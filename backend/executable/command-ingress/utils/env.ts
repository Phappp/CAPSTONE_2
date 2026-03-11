import { cleanEnv } from 'envalid';
import { bool, port, str, num } from 'envalid/dist/validators';

const env = cleanEnv(process.env, {
  PORT: port(),
  DATABASE_HOST: str(),
  DATABASE_PORT: num(),
  DATABASE_USER: str(),
  DATABASE_PASSWORD: str(),
  DATABASE_NAME: str(),
  JWT_SECRET: str(),
  JWT_REFRESH_SECRET: str(),
  DEV: bool(),
  CLIENT_URL: str(),
  GOOGLE_OAUTH_CLIENT_ID: str(),
  GOOGLE_OAUTH_CLIENT_SECRET: str(),
  GOOGLE_OAUTH_REDIRECT_URL: str(),
});

export default env;
