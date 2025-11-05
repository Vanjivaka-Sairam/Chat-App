// WebRTC utilities for handling video calls
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

// Get WebSocket URL from environment variable or use default
const WEBSOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class WebRTCManager {
  constructor(userId) {
    this.userId = userId;
    this.socket = null;
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.isOfferer = false;
    this.currentCallId = null;
    this.onLocalStream = null;
    this.onRemoteStream = null;
    this.onCallStart = null;
    this.onCallEnd = null;
    this.onUserJoined = null;
    this.onUserLeft = null;
    this.onIncomingCall = null;
    this.onSocketConnect = null;
    this.onSocketDisconnect = null;
    this.onSocketError = null;
    
    this.setupSocket();
  }

  setupSocket() {
    // Note: Since the cookie is httpOnly, we can't read it from JavaScript
    // The server will read it from the request cookies automatically
    // But we still try to get it in case it's not httpOnly
    
    let token = Cookies.get('jwt') || Cookies.get('token') || Cookies.get('authToken');
    
    // If token is not available (httpOnly cookie), that's okay
    // The server will read it from the request cookies
    console.log('Setting up socket connection...', token ? 'Token found' : 'Token will be read from httpOnly cookie');
    
    this.socket = io(WEBSOCKET_URL, {
      // Include token in auth if available (for non-httpOnly cookies)
      ...(token && { auth: { token } }),
      // Include credentials to send cookies
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('Connected to signaling server');
      if (this.onSocketConnect) {
        this.onSocketConnect();
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from signaling server:', reason);
      if (this.onSocketDisconnect) {
        this.onSocketDisconnect();
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      // Provide more helpful error messages
      let errorMessage = 'Failed to connect to the server.';
      if (error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend server is running on port 3001.';
      } else if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please log in again.';
      }
      
      if (this.onSocketError) {
        this.onSocketError(new Error(errorMessage));
      }
    });

    // Handle authentication errors
    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      if (this.onSocketError) {
        this.onSocketError(error);
      }
    });

    // Listen for available offers from other users
    this.socket.on('availableOffers', (offers) => {
      console.log('Received available offers:', offers);
    });

    // Listen for new incoming calls
    this.socket.on('newOfferAwaiting', (offers) => {
      console.log('New offer awaiting:', offers);
      if (offers && offers.length > 0) {
        this.currentCallId = offers[0].callId;
        this.handleIncomingCall(offers[0]);
      }
    });

    // Listen for call initiated confirmation
    this.socket.on('call_initiated', (data) => {
      this.currentCallId = data.callId;
      console.log('Call initiated with ID:', data.callId);
    });

    // Listen for answer response (when someone answers your call)
    this.socket.on('answerResponse', async (offerObj) => {
      console.log('Received answer response:', offerObj);
      await this.handleAnswerResponse(offerObj);
    });

    // Listen for ICE candidates
    this.socket.on('receivedIceCandidateFromServer', async (iceCandidate) => {
      console.log('Received ICE candidate:', iceCandidate);
      if (this.peerConnection && iceCandidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate));
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    // Listen for offer removal (call ended)
    this.socket.on('offer-removed', () => {
      console.log('Call ended');
      this.endCall();
    });

    // Listen for user connections
    this.socket.on('user-connected', (user) => {
      console.log('User connected:', user);
      if (this.onUserJoined) {
        this.onUserJoined(user);
      }
    });

    this.socket.on('user-disconnected', (user) => {
      console.log('User disconnected:', user);
      if (this.onUserLeft) {
        this.onUserLeft(user);
      }
    });
  }

  async startCall(targetUserId = null) {
    try {
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (this.onLocalStream) {
        this.onLocalStream(this.localStream);
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      // Add local stream to peer connection
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('sendIceCandidateToSignalingServer', {
            didIOffer: this.isOfferer,
            iceUserName: this.socket.userName || this.userId,
            iceCandidate: event.candidate,
          });
        }
      };

      // Create and send offer
      this.isOfferer = true;
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      // Send offer with optional targetUserId
      this.socket.emit('newOffer', offer, targetUserId);
      this.isCallActive = true;

      if (this.onCallStart) {
        this.onCallStart();
      }
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  async handleIncomingCall(offerObj) {
    if (!this.isCallActive) {
      // Call the onIncomingCall callback if provided
      if (this.onIncomingCall) {
        this.onIncomingCall(offerObj);
      }
    }
  }

  async acceptCall(offerObj) {
    try {
      // Store callId from offer
      if (offerObj.callId) {
        this.currentCallId = offerObj.callId;
      }

      // Get user media if not already got
      if (!this.localStream) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (this.onLocalStream) {
          this.onLocalStream(this.localStream);
        }
      }

      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
        ],
      });

      // Add local stream
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        console.log('Received remote track');
        this.remoteStream = event.streams[0];
        if (this.onRemoteStream) {
          this.onRemoteStream(this.remoteStream);
        }
      };

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('sendIceCandidateToSignalingServer', {
            didIOffer: false,
            iceUserName: this.socket.userName || this.userId,
            iceCandidate: event.candidate,
          });
        }
      };

      // Set remote description first
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerObj.offer)
      );

      // Add any ICE candidates that were already sent by the offerer
      if (offerObj.offerIceCandidates && offerObj.offerIceCandidates.length > 0) {
        for (const candidate of offerObj.offerIceCandidates) {
          try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error('Error adding offerer ICE candidate:', error);
          }
        }
      }

      // Create and send answer
      this.isOfferer = false;
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      this.socket.emit('newAnswer', offerObj, (iceCandidates) => {
        // Add stored ICE candidates from the offerer that arrived after we sent the answer
        if (iceCandidates && iceCandidates.length > 0) {
          iceCandidates.forEach((candidate) => {
            try {
              this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error('Error adding late offerer ICE candidate:', error);
            }
          });
        }
      });

      this.isCallActive = true;

      if (this.onCallStart) {
        this.onCallStart();
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      throw error;
    }
  }

  async handleAnswerResponse(offerObj) {
    try {
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerObj.answer)
      );
      
      // Add any pending ICE candidates from the answerer
      if (offerObj.answererIceCandidates) {
        for (const candidate of offerObj.answererIceCandidates) {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }
    } catch (error) {
      console.error('Error handling answer response:', error);
    }
  }

  endCall(callId = null) {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.isCallActive = false;
    this.isOfferer = false;

    // Use stored callId if not provided
    const finalCallId = callId || this.currentCallId;

    // Notify server with callId if available
    if (this.socket && finalCallId) {
      this.socket.emit('call-ended', { callId: finalCallId });
    } else if (this.socket) {
      this.socket.emit('call-ended', {});
    }

    this.currentCallId = null;

    if (this.onCallEnd) {
      this.onCallEnd();
    }
  }

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }

  disconnect() {
    this.endCall();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default WebRTCManager;
