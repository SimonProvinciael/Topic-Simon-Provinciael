'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext<{
  userName: string;
  setUserName: (name: string) => void;
} | null>(null);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userName, setUserNameState] = useState<string>('');

  useEffect(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem('userName');
    if (stored) {
      setUserNameState(stored);
    } else {
      // Generate default name
      const defaultName = `User_${Math.random().toString(36).substr(2, 9)}`;
      setUserNameState(defaultName);
      localStorage.setItem('userName', defaultName);
    }
  }, []);

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem('userName', name);
  };

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUserName = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserName must be used within UserProvider');
  }
  return context;
};
