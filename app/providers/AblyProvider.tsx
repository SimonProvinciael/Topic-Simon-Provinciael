'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Realtime } from 'ably';
import { useUserName } from './UserProvider';

const AblyContext = createContext<Realtime | null>(null);

export const AblyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [ably, setAbly] = useState<Realtime | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { userName } = useUserName();

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    
    if (!apiKey) {
      const errorMsg = 'NEXT_PUBLIC_ABLY_API_KEY is not defined';
      console.error(errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      const client = new Realtime({
        key: apiKey,
        echoMessages: true,
        autoConnect: true,
        clientId: `user_${Math.random().toString(36).substr(2, 9)}`,
      });

      // Listen for connection errors
      client.connection.on('failed', (stateChange) => {
        console.error('Connection failed:', stateChange);
        setError(`Connection failed: ${stateChange.reason?.message}`);
      });

      client.connection.on('connected', () => {
        console.log('Connected to Ably');
        setError(null);
      });

      client.connection.on('disconnected', () => {
        console.warn('Disconnected from Ably');
      });

      setAbly(client);

      return () => {
        client.close();
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to initialize Ably';
      console.error('Error initializing Ably:', errorMsg);
      setError(errorMsg);
    }
  }, []);

  // Update presence with new username when it changes
  useEffect(() => {
    if (!ably) return;

    const channel = ably.channels.get('chat-general');
    const presence = channel.presence;

    presence.update({
      status: 'online',
      name: userName,
    }).catch((err) => {
      console.error('Error updating presence with name:', err);
    });
  }, [ably, userName]);

  return (
    <AblyContext.Provider value={ably}>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">Ably Error: {error}</p>
        </div>
      )}
      {children}
    </AblyContext.Provider>
  );
};

export const useAbly = () => {
  const ably = useContext(AblyContext);
  if (!ably) {
    throw new Error('useAbly must be used within AblyProvider');
  }
  return ably;
};
