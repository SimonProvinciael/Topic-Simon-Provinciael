'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAbly } from '@/app/providers/AblyProvider';
import { useUserName } from '@/app/providers/UserProvider';
import { ChatSearch } from './ChatSearch';
import type { Message } from 'ably';

interface ChatMessage {
  id: string;
  clientId: string;
  name: string;
  text: string;
  timestamp: number;
  reactions?: { [emoji: string]: string[] }; // emoji -> array of userNames
  isPinned?: boolean;
  threadReplies?: ChatMessage[];
  parentMessageId?: string;
  file?: {
    name: string;
    type: string;
    size: number;
    data: string; // base64
  };
}

interface TypingUser {
  name: string;
  timestamp: number;
}

export const ChatMessages: React.FC<{ channelName: string }> = ({ channelName }) => {
  const ably = useAbly();
  const { userName } = useUserName();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<{ [clientId: string]: TypingUser }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Handle typing indicators
  useEffect(() => {
    if (!ably) return;

    const typingChannel = ably.channels.get(`${channelName}-typing`);
    typingChannelRef.current = typingChannel;

    const handleTyping = (message: Message) => {
      const clientId = message.clientId || 'unknown';
      setTypingUsers((prev) => ({
        ...prev,
        [clientId]: {
          name: message.data?.name || clientId,
          timestamp: Date.now(),
        },
      }));

      // Auto-remove after 3 seconds
      setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[clientId];
          return updated;
        });
      }, 3000);
    };

    typingChannel.subscribe(handleTyping).catch((err) => {
      console.error('Error subscribing to typing:', err);
    });

    return () => {
      try {
        typingChannel.unsubscribe(handleTyping);
      } catch (err) {
        console.error('Error cleaning up typing:', err);
      }
    };
  }, [ably, channelName]);

  // Main chat functionality
  useEffect(() => {
    // Check if ably is initialized
    if (!ably) {
      console.log('Ably not ready yet');
      return;
    }

    console.log('Initializing channel:', channelName);
    const channel = ably.channels.get(channelName);
    channelRef.current = channel;

    // Subscribe to messages
    const messageSubscription = (message: Message) => {
      console.log('Received message:', message);
      const chatMessage: ChatMessage = {
        id: message.id || `msg_${Date.now()}`,
        clientId: message.clientId || 'unknown',
        name: message.data?.name || message.clientId || 'unknown',
        text: message.data?.text || String(message.data),
        timestamp: message.timestamp || Date.now(),
        reactions: message.data?.reactions || {},
        isPinned: message.data?.isPinned || false,
        threadReplies: message.data?.threadReplies || [],
        parentMessageId: message.data?.parentMessageId,
        file: message.data?.file,
      };
      setMessages((prev) => [...prev, chatMessage]);
    };

    channel.subscribe(messageSubscription).catch((err) => {
      console.error('Error subscribing to messages:', err);
      setError(`Subscribe error: ${err.message}`);
    });

    // Check connection status
    const onConnected = () => {
      console.log('Chat connected');
      setIsConnected(true);
      setError(null);
    };

    const onDisconnected = () => {
      console.log('Chat disconnected');
      setIsConnected(false);
    };

    const onFailed = (stateChange: any) => {
      console.error('Connection failed:', stateChange);
      setError(`Connection failed: ${stateChange.reason?.message}`);
    };

    ably.connection.on('connected', onConnected);
    ably.connection.on('disconnected', onDisconnected);
    ably.connection.on('failed', onFailed);

    // Load message history
    channel.history({ limit: 100 })
      .then((result) => {
        if (result) {
          console.log('Loaded history:', result.items.length, 'messages');
          const historyMessages = result.items.map((message: Message) => ({
            id: message.id || `msg_${Date.now()}`,
            clientId: message.clientId || 'unknown',
            name: message.data?.name || message.clientId || 'unknown',
            text: message.data?.text || String(message.data),
            timestamp: message.timestamp || Date.now(),
            reactions: message.data?.reactions || {},
            isPinned: message.data?.isPinned || false,
            threadReplies: message.data?.threadReplies || [],
            parentMessageId: message.data?.parentMessageId,
            file: message.data?.file,
          }));
          setMessages(historyMessages);
        }
      })
      .catch((error) => {
        console.error('Error loading message history:', error);
        setError(`History error: ${error.message}`);
      });

    return () => {
      try {
        channel.unsubscribe(messageSubscription);
        ably.connection.off('connected', onConnected);
        ably.connection.off('disconnected', onDisconnected);
        ably.connection.off('failed', onFailed);
      } catch (err) {
        console.error('Error cleaning up:', err);
      }
    };
  }, [ably, channelName]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Publish typing indicator
    if (typingChannelRef.current && e.target.value.trim()) {
      typingChannelRef.current.publish('typing', {
        name: userName,
      }).catch((err: any) => {
        console.error('Error publishing typing indicator:', err);
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if ((!inputValue.trim() && !selectedFile) || !channelRef.current) {
      return;
    }

    if (!isConnected) {
      setError('Not connected to chat. Please wait...');
      return;
    }

    try {
      let messageData: any = {
        text: inputValue.trim(),
        name: userName,
        reactions: {},
        isPinned: false,
        threadReplies: [],
      };

      // Handle file upload
      if (selectedFile) {
        const reader = new FileReader();
        const fileData = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });

        messageData.file = {
          name: selectedFile.name,
          type: selectedFile.type,
          size: selectedFile.size,
          data: fileData,
        };
      }

      console.log('Sending message:', inputValue);
      await channelRef.current.publish({
        name: 'message',
        data: messageData,
      });
      setInputValue('');
      setSelectedFile(null);
      setError(null);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sending message:', errorMsg);
      setError(`Send error: ${errorMsg}`);
    }
  };

  const handleAddReaction = (messageId: string, emoji: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const updatedReactions = { ...message.reactions };
    if (!updatedReactions[emoji]) {
      updatedReactions[emoji] = [];
    }

    // Toggle reaction
    if (updatedReactions[emoji].includes(userName)) {
      updatedReactions[emoji] = updatedReactions[emoji].filter(
        (name) => name !== userName
      );
      if (updatedReactions[emoji].length === 0) {
        delete updatedReactions[emoji];
      }
    } else {
      updatedReactions[emoji].push(userName);
    }

    // Update message
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, reactions: updatedReactions } : m
      )
    );

    // Publish reaction update
    if (channelRef.current) {
      channelRef.current.publish('reaction', {
        messageId,
        reactions: updatedReactions,
      }).catch((err: any) => {
        console.error('Error publishing reaction:', err);
      });
    }
  };

  const handlePinMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
      )
    );
  };

  const emojis = ['❤️', '👍', '😂', '🎉', '🔥'];
  const typingList = Object.values(typingUsers).map((u) => u.name);

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] lg:h-full bg-white rounded-xl shadow-md lg:shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-xl flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-lg lg:text-xl font-bold">Chat</h2>
          <div className="flex items-center gap-3">
            <ChatSearch messages={messages} />
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400 animate-pulse'
                }`}
              />
              <span className="text-xs lg:text-sm">
                {isConnected ? 'Verbonden' : 'Verbreekt verbinding...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-b border-red-400 text-red-700 px-4 py-2">
          <p className="text-xs lg:text-sm">{error}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Geen berichten nog. Wees de eerste om te chatten!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2 animate-fade-in ${message.isPinned ? 'bg-yellow-50 p-2 rounded-lg border-l-4 border-yellow-400' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {message.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold text-xs lg:text-sm text-gray-800">
                    {message.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(message.timestamp).toLocaleTimeString('nl-NL')}
                  </span>
                  {message.isPinned && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">
                      📌 Vast
                    </span>
                  )}
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-2 lg:p-3 mt-1">
                  <p className="text-sm lg:text-base text-gray-800 break-words">
                    {message.text}
                  </p>

                  {/* File display */}
                  {message.file && (
                    <div className="mt-2 border-t border-gray-200 pt-2">
                      {message.file.type.startsWith('image/') ? (
                        <img
                          src={message.file.data}
                          alt={message.file.name}
                          className="max-w-xs rounded-lg cursor-pointer hover:opacity-80"
                          onClick={() => {
                            const a = document.createElement('a');
                            a.href = message.file!.data;
                            a.download = message.file!.name;
                            a.click();
                          }}
                        />
                      ) : (
                        <a
                          href={message.file.data}
                          download={message.file.name}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm text-blue-700"
                        >
                          📎 {message.file.name}
                          <span className="text-xs text-blue-600">
                            ({(message.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Reactions */}
                {Object.keys(message.reactions || {}).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(message.reactions || {}).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={() => handleAddReaction(message.id, emoji)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition-colors ${
                          users.includes(userName)
                            ? 'bg-blue-200 text-blue-800'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={users.join(', ')}
                      >
                        {emoji} <span>{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Reaction buttons */}
                <div className="flex gap-1 mt-2 opacity-0 hover:opacity-100 transition-opacity">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleAddReaction(message.id, emoji)}
                      className="w-6 h-6 text-xs hover:bg-gray-200 rounded transition-colors"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePinMessage(message.id)}
                    className="w-6 h-6 text-xs hover:bg-gray-200 rounded transition-colors"
                    title="Pin message"
                  >
                    📌
                  </button>
                </div>

                {/* Thread replies indicator */}
                {message.threadReplies && message.threadReplies.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline">
                    💬 {message.threadReplies.length} antwoord{message.threadReplies.length > 1 ? 'en' : ''}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {typingList.length > 0 && (
          <div className="flex gap-2 items-center text-sm text-gray-600 italic">
            <div className="flex gap-1">
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
              <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
            </div>
            <span>
              {typingList.join(', ')} {typingList.length === 1 ? 'typt' : 'typen'}...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-gray-200 p-3 lg:p-4 bg-white rounded-b-xl flex-shrink-0 space-y-2"
      >
        {selectedFile && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-2">
            <span className="text-xs text-blue-800">📎 {selectedFile.name}</span>
            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={isConnected ? "Typ een bericht..." : "Wacht tot verbinding..."}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 text-gray-900 placeholder-gray-500 font-medium text-sm"
            disabled={!isConnected}
          />
          <label className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Bestand toevoegen">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
              disabled={!isConnected}
            />
          </label>
          <button
            type="submit"
            disabled={!isConnected || (!inputValue.trim() && !selectedFile)}
            className="px-4 lg:px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm flex-shrink-0"
          >
            <span className="hidden lg:inline">Verzenden</span>
            <span className="lg:hidden">⤴</span>
          </button>
        </div>
      </form>
    </div>
  );
};
