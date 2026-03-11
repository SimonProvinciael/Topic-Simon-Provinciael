'use client';

import React, { useState } from 'react';
import { useUserName } from '@/app/providers/UserProvider';

export const UserProfile: React.FC = () => {
  const { userName, setUserName } = useUserName();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(userName);

  const handleSave = () => {
    if (inputValue.trim() && inputValue !== userName) {
      setUserName(inputValue.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setInputValue(userName);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-600 text-white rounded-full flex items-center justify-center text-xl font-bold">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          {isEditing ? (
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Je naam
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Voer je naam in..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-colors"
                >
                  Opslaan
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600">Je bent aangemeld als:</p>
              <p className="text-2xl font-bold text-gray-900">{userName}</p>
            </div>
          )}
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
          >
            Naam wijzigen
          </button>
        )}
      </div>
    </div>
  );
};
