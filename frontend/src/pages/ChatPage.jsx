import React, { useEffect, useState, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { StreamChat } from 'stream-chat';
import { getStreamToken, getUserFriends } from '../lib/api';
import useAuthUser from '../hooks/useAuthUser';
import { ArrowLeft, MessageSquare, Phone, Video } from 'lucide-react';
import { WebRTCContext } from '../context/WebRTCContext';

const ChatPage = () => {
  const [chatClient, setChatClient] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [error, setError] = useState(null);
  const { authUser, isLoading: loadingUser } = useAuthUser();
  const [searchParams] = useSearchParams();
  const friendId = searchParams.get('friendId');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { callFriend, onlineFriends, socketConnected } = useContext(WebRTCContext) || {};
  const [friendInfo, setFriendInfo] = useState(null);

  // Get friend info from friends list
  useEffect(() => {
    const fetchFriendInfo = async () => {
      if (!friendId) return;
      try {
        const friends = await getUserFriends();
        const friend = friends.find(f => f._id === friendId);
        if (friend) {
          setFriendInfo(friend);
        }
      } catch (error) {
        console.error('Error fetching friend info:', error);
      }
    };
    fetchFriendInfo();
  }, [friendId]);

  const isFriendOnline = friendId && onlineFriends?.some(f => f.userId === friendId);

  useEffect(() => {
    const initializeStream = async () => {
      if (!authUser || loadingUser) return;

      try {
        // Get Stream token
        const { token } = await getStreamToken();
        const clientId = authUser._id.toString();

        // Get Stream API Key from environment
        const apiKey = import.meta.env.VITE_STREAM_API_KEY;
        
        if (!apiKey) {
          throw new Error('Stream API key not found. Please add VITE_STREAM_API_KEY to your .env file');
        }

        // Initialize Stream Chat client
        const client = StreamChat.getInstance(apiKey);
        await client.connectUser(
          {
            id: clientId,
            name: authUser.fullName,
            image: authUser.profilePic,
          },
          token
        );

        setChatClient(client);

        // If there's a friend ID, create/get a channel with that friend
        if (friendId) {
          const channel = client.channel('messaging', `${clientId}_${friendId}`, {
            members: [clientId, friendId],
          });
          await channel.watch(); // Watch the channel
          setActiveChannel(channel);
        }
      } catch (error) {
        console.error('Error initializing Stream Chat:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeStream();

    // Cleanup on unmount
    return () => {
      if (chatClient) {
        chatClient.disconnect();
      }
    };
  }, [authUser, loadingUser, friendId]);

  if (loading || loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !chatClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-base-200">
        <div className="text-center max-w-md p-8 bg-base-100 rounded-lg shadow-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Chat Setup Required</h2>
          <div className="text-left space-y-3 mb-6 p-4 bg-base-200 rounded-lg">
            {error && (
              <div className="alert alert-error mb-4">
                <span>{error}</span>
              </div>
            )}
            <p className="text-sm font-semibold">To enable chat, you need to:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Create a `.env` file in the frontend folder</li>
              <li>Add: <code className="bg-base-300 px-2 py-1 rounded">VITE_STREAM_API_KEY=your_key_here</code></li>
              <li>Restart the dev server</li>
            </ol>
          </div>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Go to Home
            </button>
            <button className="btn btn-outline" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="flex h-screen">
        {/* Sidebar with channel list */}
        <div className="w-80 bg-base-300 border-r border-base-300 flex flex-col">
          <div className="p-4 border-b border-base-300 flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="btn btn-ghost btn-sm btn-circle"
            >
              <ArrowLeft size={20} />
            </button>
            <h2 className="text-xl font-bold">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <p className="text-base-content/70 text-sm">
              Your conversations will appear here
            </p>
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {activeChannel ? (
            <div className="flex-1 flex flex-col bg-base-100">
              {/* Chat header */}
              <div className="p-4 border-b border-base-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {friendInfo && (
                    <>
                      <div className="avatar">
                        <div className="w-10 rounded-full">
                          <img src={friendInfo.profilePic} alt={friendInfo.fullName} />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">{friendInfo.fullName}</h3>
                        <p className={`text-sm ${isFriendOnline ? 'text-success' : 'text-base-content/70'}`}>
                          {isFriendOnline ? '🟢 Online' : '⚫ Offline'}
                        </p>
                      </div>
                    </>
                  )}
                  {!friendInfo && <h3 className="text-lg font-semibold">Chat with Friend</h3>}
                </div>
                
                {/* Call buttons */}
                {friendInfo && isFriendOnline && callFriend && socketConnected && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => callFriend(friendInfo, false)}
                      className="btn btn-primary btn-sm"
                      title="Start video call"
                    >
                      <Video size={18} />
                    </button>
                    <button
                      onClick={() => callFriend(friendInfo, true)}
                      className="btn btn-primary btn-sm"
                      title="Start audio call"
                    >
                      <Phone size={18} />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Messages area - simple implementation */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <p className="text-center text-base-content/70">
                  Chat feature ready! Messages will appear here.
                </p>
              </div>

              {/* Message input */}
              <div className="p-4 border-t border-base-300">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    className="input input-bordered flex-1"
                  />
                  <button className="btn btn-primary">
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2">No active chat</h3>
                <p className="text-base-content/70 mb-4">
                  Start a conversation from your friends list
                </p>
                <button onClick={() => navigate('/')} className="btn btn-primary">
                  Go to Friends
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
