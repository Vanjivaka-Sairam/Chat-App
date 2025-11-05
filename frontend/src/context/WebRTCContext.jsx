import React, { createContext, useState, useRef, useCallback, useEffect } from 'react';
import WebRTCManager from '../lib/webrtc';

export const WebRTCContext = createContext();

export const WebRTCProvider = ({ children, userId, userInfo }) => {
  const webrtcManagerRef = useRef(null);
  const [onlineFriends, setOnlineFriends] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const currentCallIdRef = useRef(null);

  // Initialize WebRTC Manager
  useEffect(() => {
    if (!userId || !userInfo) {
      console.log('WebRTC: Waiting for user authentication...');
      return;
    }

    console.log('WebRTC: Initializing with userId:', userId);
    webrtcManagerRef.current = new WebRTCManager(userId);

    // Set up callbacks
    webrtcManagerRef.current.onLocalStream = (stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };

    webrtcManagerRef.current.onRemoteStream = (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    };

    webrtcManagerRef.current.onSocketConnect = () => {
      setSocketConnected(true);
      // Request online friends list
      if (webrtcManagerRef.current?.socket) {
        webrtcManagerRef.current.socket.emit('get_online_friends', userId);
      }
    };

    webrtcManagerRef.current.onSocketDisconnect = () => {
      setSocketConnected(false);
    };

    webrtcManagerRef.current.onSocketError = (error) => {
      console.error('Socket error:', error);
      setSocketConnected(false);
      // Don't show error if it's a connection attempt - let it retry
      if (error.message && !error.message.includes('ECONNREFUSED')) {
        console.error('WebRTC connection error:', error.message);
      }
    };

    webrtcManagerRef.current.onCallStart = () => {
      setActiveCall((prev) => ({
        ...prev,
        status: 'active',
      }));
    };

    webrtcManagerRef.current.onCallEnd = () => {
      setActiveCall(null);
      setLocalStream(null);
      setRemoteStream(null);
      currentCallIdRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };

    webrtcManagerRef.current.onIncomingCall = (offerObj) => {
      setIncomingCall({
        callId: offerObj.callId,
        caller: {
          userId: offerObj.offererUserId,
          fullName: offerObj.offererUserName,
          profilePic: '', // Could be enhanced to include profile pic
        },
        callerId: offerObj.offererUserId,
        offerObj,
      });
    };

    // Listen for online friends updates
    if (webrtcManagerRef.current?.socket) {
      webrtcManagerRef.current.socket.on('online_friends_list', (friends) => {
        setOnlineFriends(friends);
      });

      webrtcManagerRef.current.socket.on('user_status_update', (data) => {
        // Update online friends list when status changes
        if (webrtcManagerRef.current?.socket) {
          webrtcManagerRef.current.socket.emit('get_online_friends', userId);
        }
      });

      // Listen for call initiated confirmation
      webrtcManagerRef.current.socket.on('call_initiated', (data) => {
        currentCallIdRef.current = data.callId;
        setActiveCall((prev) => ({
          ...prev,
          callId: data.callId,
          status: 'ringing',
        }));
      });

      // Listen for call failed
      webrtcManagerRef.current.socket.on('call_failed', (data) => {
        alert(data.error || 'Call failed');
        setActiveCall(null);
      });

      // Listen for call ended
      webrtcManagerRef.current.socket.on('call_ended', (data) => {
        endCall();
      });
    }

    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.disconnect();
      }
    };
  }, [userId, userInfo]);

  // Update video refs when streams change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Initiate a call to a friend
  const callFriend = useCallback(async (friendData, audioOnly = false) => {
    try {
      if (!webrtcManagerRef.current || !socketConnected) {
        alert('Please wait for connection to establish...');
        return;
      }

      // Set call state
      setActiveCall({
        calleeId: friendData._id || friendData.userId,
        status: 'calling',
        callerInfo: userInfo,
        audioOnly,
      });

      // Start call with target user ID
      await webrtcManagerRef.current.startCall(friendData._id || friendData.userId);
    } catch (error) {
      console.error('Error initiating call:', error);
      alert(error.message || 'Failed to start call. Please check your camera and microphone permissions.');
      setActiveCall(null);
    }
  }, [userInfo, socketConnected]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    try {
      if (!webrtcManagerRef.current || !incomingCall) return;

      await webrtcManagerRef.current.acceptCall(incomingCall.offerObj);
      
      setActiveCall({
        ...incomingCall,
        status: 'accepted',
      });
      
      currentCallIdRef.current = incomingCall.callId;
      setIncomingCall(null);
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call.');
      setIncomingCall(null);
    }
  }, [incomingCall]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    setIncomingCall(null);
    // Optionally notify the caller that the call was rejected
    // This would require additional backend support
  }, []);

  // End call
  const endCall = useCallback(() => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.endCall(currentCallIdRef.current);
    }
    setActiveCall(null);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
    currentCallIdRef.current = null;
  }, []);

  // Toggle audio
  const toggleAudio = useCallback((enabled) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleAudio();
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback((enabled) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleVideo();
    }
  }, []);

  const value = {
    onlineFriends,
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    localVideoRef,
    remoteVideoRef,
    socketConnected,
    callFriend,
    acceptCall,
    rejectCall,
    endCall,
    toggleAudio,
    toggleVideo,
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
};

