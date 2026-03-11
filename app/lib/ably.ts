import { Realtime } from 'ably';

export const getAblyClient = () => {
  const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
  
  if (!apiKey) {
    throw new Error('NEXT_PUBLIC_ABLY_API_KEY is not defined');
  }

  const ably = new Realtime({
    key: apiKey,
    echoMessages: false,
    clientId: `user_${Math.random().toString(36).substr(2, 9)}`,
  });

  return ably;
};
