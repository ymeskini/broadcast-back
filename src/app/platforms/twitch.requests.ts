import { AppError } from '../../lib/AppError.js';
import { envVariables } from '../../lib/env.js';

const TWITCH_OAUTH_URL = 'https://id.twitch.tv';
const OAUTH_PATH = '/oauth2';

export const getTwitchOAuthURL = (withSecret: boolean = true) => {
  const url = new URL(TWITCH_OAUTH_URL);

  url.searchParams.set('client_id', envVariables.TWITCH_ID);
  if (withSecret) {
    url.searchParams.set('client_secret', envVariables.TWITCH_SECRET);
  }

  return url;
};

const getTwitchParams = (code: string) => {
  const url = getTwitchOAuthURL();

  url.pathname = `${OAUTH_PATH}/token`;

  url.searchParams.set('code', code);
  url.searchParams.set('redirect_uri', 'http://localhost:5173/redirect/twitch');
  url.searchParams.set('grant_type', 'authorization_code');

  return url;
};

type TwitchTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: 'bearer';
};

export const getTwitchAccessToken = async (code: string) => {
  const url = getTwitchParams(code);
  const response = await fetch(url, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new AppError('Failed to get Access Token', response.status);
  }

  return (await response.json()) as TwitchTokenResponse;
};

export const getUserInfo = async () => {
  const url = getTwitchOAuthURL();

  url.pathname = `${OAUTH_PATH}/userinfo`;

  const response = await fetch(url);
  return (await response.json()) as {
    preferred_username: string;
    sub: string;
  };
};
