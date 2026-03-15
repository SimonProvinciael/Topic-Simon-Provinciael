'use client';

import React, { useEffect, useState } from 'react';
import { useAbly } from '@/app/providers/AblyProvider';
import { useUserName } from '@/app/providers/UserProvider';
import type { PresenceMessage } from 'ably';
import { formatTimeAgo } from '@/app/lib/timeUtils';

interface User {
  clientId: string;
  name: string;
  status: string;
  lastSeen: number;
  activity?: string;
  statusMessage?: string;
}

export const ChatPresence: React.FC<{ channelName: string }> = ({ channelName }) => {
  const ably = useAbly();
  const { userName, setUserName } = useUserName();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [isEditingName, setIsEditingName] = useState(false);
  const [inputName, setInputName] = useState(userName);
  const [selectedActivity, setSelectedActivity] = useState('chatting');
  const [statusMessage, setStatusMessage] = useState('');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Trigger re-render every second to update time ago
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdateTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update input when userName changes
  useEffect(() => {
    setInputName(userName);
  }, [userName]);

  useEffect(() => {
    // Check if ably is initialized
    if (!ably) {
      console.log('Ably not ready for presence yet');
      return;
    }

    console.log('Initializing presence for channel:', channelName);
    const channel = ably.channels.get(channelName);
    const presence = channel.presence;

    // Enter the presence channel
    presence.enter({
      status: 'online',
      name: userName,
      activity: 'chatting',
      statusMessage: '',
    }).catch((err) => {
      console.error('Error entering presence:', err);
      setError(`Presence error: ${err.message}`);
    });

    // Subscribe to presence updates
    const handleEnter = (message: PresenceMessage) => {
      console.log('User entered:', message.clientId);
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.clientId !== message.clientId);
        return [
          ...filtered,
          {
            clientId: message.clientId || 'unknown',
            name: message.data?.name || message.clientId || 'unknown',
            status: message.data?.status || 'online',
            lastSeen: Date.now(),
            activity: message.data?.activity || 'chatting',
            statusMessage: message.data?.statusMessage || '',
          },
        ];
      });
    };

    const handleUpdate = (message: PresenceMessage) => {
      console.log('User updated:', message.clientId);
      setUsers((prev) =>
        prev.map((u) =>
          u.clientId === message.clientId
            ? {
                ...u,
                name: message.data?.name || u.name,
                status: message.data?.status || 'online',
                lastSeen: Date.now(),
                activity: message.data?.activity || u.activity || 'chatting',
                statusMessage: message.data?.statusMessage || u.statusMessage || '',
              }
            : u
        )
      );
    };

    const handleLeave = (message: PresenceMessage) => {
      console.log('User left:', message.clientId);
      setUsers((prev) => prev.filter((u) => u.clientId !== message.clientId));
    };

    presence.subscribe('enter', handleEnter);
    presence.subscribe('update', handleUpdate);
    presence.subscribe('leave', handleLeave);

    // Get current presence members
    presence.get()
      .then((members: PresenceMessage[]) => {
        console.log('Current members:', members.length);
        const memberList = members.map((member) => ({
          clientId: member.clientId || 'unknown',
          name: member.data?.name || member.clientId || 'unknown',
          status: member.data?.status || 'online',
          lastSeen: Date.now(),
          activity: member.data?.activity || 'chatting',
          statusMessage: member.data?.statusMessage || '',
        }));
        setUsers(memberList);
      })
      .catch((err) => {
        console.error('Error getting presence members:', err);
        setError(`Get presence error: ${err.message}`);
      });

    return () => {
      try {
        presence.leave();
        presence.unsubscribe('enter', handleEnter);
        presence.unsubscribe('update', handleUpdate);
        presence.unsubscribe('leave', handleLeave);
      } catch (err) {
        console.error('Error cleaning up presence:', err);
      }
    };
  }, [ably, channelName]);

  const handleSaveName = () => {
    if (inputName.trim() && inputName !== userName) {
      setUserName(inputName.trim());
      
      // Update presence with new name
      if (ably) {
        const channel = ably.channels.get(channelName);
        channel.presence.update({
          status: 'online',
          name: inputName.trim(),
          activity: selectedActivity,
          statusMessage: statusMessage,
        }).catch((err) => {
          console.error('Error updating presence:', err);
        });
      }
    }
    setIsEditingName(false);
  };

  const handleSaveStatus = () => {
    if (ably) {
      const channel = ably.channels.get(channelName);
      channel.presence.update({
        status: 'online',
        name: userName,
        activity: selectedActivity,
        statusMessage: statusMessage,
      }).catch((err) => {
        console.error('Error updating presence:', err);
      });
    }
    setIsEditingStatus(false);
  };

  const activityOptions = ['chatting', 'idle', 'away', 'in training', 'busy'];

  const handleCancelName = () => {
    setInputName(userName);
    setIsEditingName(false);
  };

  return (
    <div className="w-full lg:w-64 bg-white rounded-xl lg:rounded-xl shadow-md lg:shadow-md flex flex-col h-full lg:h-full border border-gray-100">
      {/* Header */}
      <div className="text-white p-4 rounded-t-xl" style={{ backgroundColor: "#315219" }}>
        <h3 className="text-base font-semibold">Je Profiel</h3>
      </div>

      {/* Profile Section */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md" style={{ backgroundColor: "#315219" }}>
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">INGELOGD ALS</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{userName}</p>
          </div>
          {/* Profile Menu Button */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Profiel instellingen"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2m0 7a1 1 0 110-2 1 1 0 010 2" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {profileMenuOpen && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-max">
                <button
                  onClick={() => {
                    setIsEditingName(true);
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-200 font-medium text-gray-800"
                >
                  ✏️ Naam wijzigen
                </button>
                <button
                  onClick={() => {
                    setIsEditingStatus(true);
                    setProfileMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 font-medium text-gray-800"
                >
                  ⚙️ Status instellen
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditingName ? (
          <div className="space-y-2 animate-fade-in">
            <input
               type="text"
               value={inputName}
               onChange={(e) => setInputName(e.target.value)}
               placeholder="Voer je naam in..."
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none text-sm font-medium transition-all text-gray-900 placeholder-gray-500"
               style={{ "--tw-ring-color": "#315219" } as React.CSSProperties}
               autoFocus
             />
             <div className="flex gap-2">
               <button
                 onClick={handleSaveName}
                 className="flex-1 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm hover:opacity-90"
                 style={{ backgroundColor: "#315219" }}
               >
                 ✓ Opslaan
               </button>
               <button
                 onClick={handleCancelName}
                 className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-400 transition-colors shadow-sm"
               >
                 ✕ Annuleren
               </button>
             </div>
          </div>
        ) : null}

        {/* Activity & Status Section */}
        {isEditingStatus ? (
          <div className="space-y-2 animate-fade-in bg-gray-50 p-3 rounded-lg">
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Status
              </label>
               <select
                 value={selectedActivity}
                 onChange={(e) => setSelectedActivity(e.target.value)}
                 className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none"
                 style={{ "--tw-ring-color": "#315219" } as React.CSSProperties}
               >
                {activityOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Bericht
              </label>
               <input
                 type="text"
                 value={statusMessage}
                 onChange={(e) => setStatusMessage(e.target.value)}
                 placeholder="Bijv. 'In scouting activiteit'"
                 className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-500 focus:outline-none"
                 style={{ "--tw-ring-color": "#315219" } as React.CSSProperties}
               />
            </div>
             <div className="flex gap-2">
               <button
                 onClick={handleSaveStatus}
                 className="flex-1 px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors hover:opacity-90"
                 style={{ backgroundColor: "#315219" }}
               >
                 ✓ Opslaan
               </button>
               <button
                 onClick={() => setIsEditingStatus(false)}
                 className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-400 transition-colors"
               >
                 ✕ Annuleren
               </button>
             </div>
          </div>
        ) : null}
      </div>

       {/* Online Users Section */}
       <div className="flex-1 flex flex-col overflow-hidden">
         <div className="text-white px-4 py-3" style={{ backgroundColor: "#4a6b27" }}>
           <h3 className="text-base font-semibold">Online</h3>
           <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.8)" }}>{users.length} {users.length === 1 ? 'persoon' : 'personen'}</p>
         </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-2 m-3 rounded text-xs">
            <p className="font-medium">Fout</p>
            <p>{error}</p>
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {users.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-xs text-center px-4">
                Nog geen gebruikers online
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {users.map((user) => (
                <div
                  key={user.clientId}
                  className="flex items-center gap-3 p-2.5 bg-gradient-to-r from-gray-50 to-white rounded-lg hover:from-indigo-50 hover:to-blue-50 transition-colors border border-gray-100 hover:border-indigo-200"
                >
                  <div className="relative flex-shrink-0">
                     <div className="w-9 h-9 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md" style={{ backgroundColor: "#315219" }}>
                       {user.name.substring(0, 2).toUpperCase()}
                     </div>
                     <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                   </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {user.name}
                    </p>
                     <div className="flex items-center gap-1 flex-wrap">
                       <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: "#4a6b27" }}>
                         {user.activity || 'chatting'}
                       </span>
                      {user.statusMessage && (
                        <span className="text-xs text-gray-600 italic truncate">
                          "{user.statusMessage}"
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTimeAgo(user.lastSeen)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
