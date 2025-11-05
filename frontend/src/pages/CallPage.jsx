import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X } from 'lucide-react';
import WebRTCManager from '../lib/webrtc';
import useAuthUser from '../hooks/useAuthUser';

const CallPage = () => {
  const navigate = useNavigate();
  const { authUser } = useAuthUser();
  const [searchParams] = useSearchParams();
  const targetUserId = searchParams.get('userId');
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const webrtcManagerRef = useRef(null);
  const localStreamRef = useRef(null);
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [incomingCallFrom, setIncomingCallFrom] = useState(null);
  const [callerInfo, setCallerInfo] = useState(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [hasLocalStream, setHasLocalStream] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (!authUser?._id) return;
    
    // Get the current user ID from auth user
    const userId = authUser._id;
    
    // Initialize WebRTC Manager
    webrtcManagerRef.current = new WebRTCManager(userId);

    // Set up callbacks
    webrtcManagerRef.current.onLocalStream = (stream) => {
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setHasLocalStream(true);
    };
    
    // Track socket connection
    webrtcManagerRef.current.onSocketConnect = () => {
      console.log('Socket connected');
      setSocketConnected(true);
      setError(null);
    };
    
    webrtcManagerRef.current.onSocketDisconnect = () => {
      console.log('Socket disconnected');
      setSocketConnected(false);
    };
    
    webrtcManagerRef.current.onSocketError = (err) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to the server. Please make sure the backend is running on port 3001.');
      setSocketConnected(false);
    };
    
    // Check initial socket connection state
    if (webrtcManagerRef.current.socket && webrtcManagerRef.current.socket.connected) {
      setSocketConnected(true);
    }

    webrtcManagerRef.current.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        setIsCallActive(true);
      }
    };

    webrtcManagerRef.current.onCallStart = () => {
      setIsCallActive(true);
      setIsStartingCall(false);
    };

    webrtcManagerRef.current.onCallEnd = () => {
      setIsCallActive(false);
      setHasLocalStream(false);
      localStreamRef.current = null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    };

    webrtcManagerRef.current.onIncomingCall = (offerObj) => {
      setIncomingCallFrom(offerObj.offererUserName);
      setCallerInfo(offerObj);
      setIsIncomingCall(true);
    };

    // Cleanup on unmount
    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.disconnect();
      }
    };
  }, [authUser]);
  
  // Update local video stream when ref changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [hasLocalStream, isCallActive]);

  const startCall = async () => {
    if (!socketConnected) {
      setError('Please wait for the connection to establish...');
      return;
    }
    
    setIsStartingCall(true);
    setError(null);
    try {
      await webrtcManagerRef.current.startCall(targetUserId);
    } catch (error) {
      console.error('Error starting call:', error);
      const errorMsg = error.message || 'Failed to start call. Please check your camera and microphone permissions.';
      setError(errorMsg);
      setIsStartingCall(false);
      alert(errorMsg);
    }
  };

  const endCall = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.endCall();
    }
    setIsCallActive(false);
    setIsIncomingCall(false);
    setHasLocalStream(false);
    localStreamRef.current = null;
  };

  const acceptCall = async () => {
    try {
      await webrtcManagerRef.current.acceptCall(callerInfo);
      setIsIncomingCall(false);
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to accept call.');
    }
  };

  const rejectCall = () => {
    setIsIncomingCall(false);
    setIncomingCallFrom(null);
    setCallerInfo(null);
    // Optionally notify the caller that the call was rejected
  };

  const toggleVideo = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleVideo();
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.toggleAudio();
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Socket Status Indicator */}
        <div className="mb-4">
          {!socketConnected && !error && (
            <div className="alert alert-info">
              <span>Connecting to server... Please wait.</span>
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              <span>{error}</span>
              <button onClick={() => {
                setError(null);
                // Try to reconnect
                if (webrtcManagerRef.current?.socket) {
                  webrtcManagerRef.current.socket.connect();
                }
              }} className="btn btn-sm btn-ghost">Retry</button>
            </div>
          )}
        </div>
        
        {/* Incoming Call Modal */}
        {isIncomingCall && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-base-100 rounded-lg p-8 max-w-md w-full text-center shadow-xl">
              <div className="mb-6">
                <div className="w-24 h-24 bg-primary rounded-full mx-auto flex items-center justify-center text-4xl text-primary-content mb-4">
                  {incomingCallFrom?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-2xl font-bold">{incomingCallFrom}</h2>
                <p className="text-base-content/70 mt-2">Incoming video call</p>
              </div>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={rejectCall}
                  className="btn btn-error btn-lg btn-circle"
                >
                  <PhoneOff size={24} />
                </button>
                <button
                  onClick={acceptCall}
                  className="btn btn-success btn-lg btn-circle"
                >
                  <Phone size={24} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Call Interface */}
        <div className="relative bg-base-300 rounded-lg overflow-hidden shadow-2xl aspect-video">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Local Video - Show in main area when no active call, PIP when call is active */}
          {hasLocalStream && (
            <>
              {/* Main area for local video when no active call */}
              {!isCallActive && (
                <video
                  ref={(el) => {
                    localVideoRef.current = el;
                    if (el && localStreamRef.current) {
                      el.srcObject = localStreamRef.current;
                    }
                  }}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              
              {/* Picture-in-Picture for local video when call is active */}
              {isCallActive && (
                <div className="absolute top-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden shadow-lg border-2 border-base-content/20">
                  <video
                    ref={(el) => {
                      localVideoRef.current = el;
                      if (el && localStreamRef.current) {
                        el.srcObject = localStreamRef.current;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </>
          )}

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
            {!isCallActive && !isStartingCall ? (
              <div className="flex justify-center">
                <button
                  onClick={startCall}
                  className="btn btn-primary btn-lg btn-circle"
                  disabled={isStartingCall}
                >
                  <Phone size={24} />
                </button>
              </div>
            ) : isCallActive ? (
              <div className="flex justify-center gap-4">
                <button
                  onClick={toggleVideo}
                  className={`btn btn-circle btn-lg ${
                    isVideoEnabled ? 'btn-primary' : 'btn-error'
                  }`}
                >
                  {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                </button>
                <button
                  onClick={toggleAudio}
                  className={`btn btn-circle btn-lg ${
                    isAudioEnabled ? 'btn-primary' : 'btn-error'
                  }`}
                >
                  {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                <button
                  onClick={endCall}
                  className="btn btn-error btn-lg btn-circle"
                >
                  <PhoneOff size={24} />
                </button>
              </div>
            ) : (
              <div className="text-center text-white">
                <div className="loading loading-spinner loading-lg"></div>
                <p className="mt-4">Connecting...</p>
              </div>
            )}
          </div>

                     {/* Instructions for starting call */}
          {!isCallActive && !isStartingCall && !isIncomingCall && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-base-content/70 max-w-md p-8">
                <Phone size={64} className="mx-auto mb-4 opacity-50" />
                <h3 className="text-2xl font-bold mb-2">
                  {targetUserId ? 'Call a Friend' : 'Start a Video Call'}
                </h3>
                <p className="mb-6">
                  {targetUserId
                    ? 'Click the button below to call your friend. They will receive a call notification.'
                    : 'Click the button below to start a video call. Your call will be available for other users to join.'}
                </p>
                <button onClick={startCall} className="btn btn-primary btn-lg">
                  Start Call
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Back Button */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="btn btn-ghost"
          >
            <X size={20} className="mr-2" />
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallPage;
