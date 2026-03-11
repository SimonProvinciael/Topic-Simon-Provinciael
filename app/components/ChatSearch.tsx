'use client';

import React, { useState } from 'react';

interface SearchResult {
  messageId: string;
  name: string;
  text: string;
  timestamp: number;
}

export const ChatSearch: React.FC<{ messages: any[] }> = ({ messages }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    const filtered = messages.filter(
      (msg) =>
        msg.text.toLowerCase().includes(query.toLowerCase()) ||
        msg.name.toLowerCase().includes(query.toLowerCase())
    );

    const searchResults = filtered.map((msg) => ({
      messageId: msg.id,
      name: msg.name,
      text: msg.text.substring(0, 100) + (msg.text.length > 100 ? '...' : ''),
      timestamp: msg.timestamp,
    }));

    setResults(searchResults);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setSearchOpen(!searchOpen)}
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        title="Search messages"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {searchOpen && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 p-3">
          <input
            type="text"
            placeholder="Zoeken in berichten..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
            autoFocus
          />

          {results.length > 0 && (
            <div className="mt-3 max-h-64 overflow-y-auto space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer transition-colors text-sm"
                >
                  <p className="font-semibold text-gray-800">{result.name}</p>
                  <p className="text-gray-600">{result.text}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(result.timestamp).toLocaleString('nl-NL')}
                  </p>
                </div>
              ))}
            </div>
          )}

          {searchQuery && results.length === 0 && (
            <div className="mt-3 text-sm text-gray-500 text-center">
              Geen resultaten gevonden
            </div>
          )}
        </div>
      )}
    </div>
  );
};
