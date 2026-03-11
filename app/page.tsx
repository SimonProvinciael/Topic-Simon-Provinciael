'use client';

import { ChatMessages } from './components/ChatMessages';
import { ChatPresence } from './components/ChatPresence';
import { useEffect, useState } from 'react';

function ChatContent() {
  const [isClient, setIsClient] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Don't render until client-side
  }

  const channelName = 'chat-general';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-xl font-bold text-gray-900">ScoutSync Chat</h1>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          aria-label="Toggle sidebar"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block mb-8 pt-8 px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">ScoutSync Chat</h1>
        <p className="text-gray-600">Real-time messaging powered by Ably</p>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 lg:hidden z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-80px)] lg:h-auto gap-0 lg:gap-6 px-0 lg:px-4 pb-0 lg:pb-4">
      {/* Sidebar - Sliding on Mobile, Static on Desktop */}
        <div
          className={`fixed left-0 top-20 bottom-0 w-64 bg-white rounded-r-xl shadow-2xl z-50 transform lg:relative lg:top-auto lg:bottom-auto lg:shadow-none lg:bg-transparent lg:rounded-none lg:w-64 ${
            sidebarOpen ? 'animate-slide-in' : 'hidden lg:block lg:animate-none'
          }`}
        >
          <div className="h-full overflow-y-auto lg:overflow-visible">
            <ChatPresence key={`presence-${channelName}`} channelName={channelName} />
          </div>
        </div>

        {/* Chat Messages - Main */}
        <div className="flex-1 min-h-[600px] max-w-7xl lg:mx-auto w-full lg:w-auto">
          <ChatMessages key={channelName} channelName={channelName} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <ChatContent />;
}
