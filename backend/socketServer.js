// WebRTC Signaling Server
// This server handles WebRTC signaling for video/audio calls

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/user.model');
const CallHistory = require('./models/CallHistory.model');

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin or from allowed origins
      const allowedOrigins = [
        "http://localhost:5173",
        process.env.FRONTEND_URL,
      ].filter(Boolean);
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Cookie', 'Authorization'],
  },
});

// In-memory storage for active offers and connected users
const offers = [];
const connectedSockets = [];
const activeUsers = new Map(); // Store active users with their socket IDs and metadata
const activeCalls = new Map(); // Store ongoing calls with callId

// Helper function to parse cookies from request
function parseCookies(cookieString) {
  const cookies = {};
  if (cookieString) {
    cookieString.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
  }
  return cookies;
}

// Helper function to verify JWT token
const verifyToken = async (socket, next) => {
  try {
    // Try to get token from auth object first (for non-httpOnly cookies)
    let token = socket.handshake.auth?.token;
    
    // If not in auth, try to get from cookies (httpOnly cookies)
    if (!token) {
      const cookieHeader = socket.handshake.headers.cookie;
      const cookies = parseCookies(cookieHeader);
      token = cookies.jwt;
    }
    
    if (!token) {
      console.error('Socket authentication failed: No token provided');
      console.log('Handshake headers:', socket.handshake.headers);
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.error('Socket authentication failed: User not found', decoded.userId);
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.userName = user.fullName;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Authentication error: Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication error: Token expired'));
    }
    return next(new Error('Authentication error: ' + error.message));
  }
};

// Use authentication middleware
io.use(verifyToken);

io.on('connection', async (socket) => {
  console.log(`New connection: ${socket.userName} (${socket.id})`);
  
  // Get user info from database
  const user = await User.findById(socket.userId).select('-password');
  
  // Register user in activeUsers map
  activeUsers.set(socket.id, {
    userId: socket.userId,
    socketId: socket.id,
    fullName: socket.userName,
    email: user?.email || '',
    profilePic: user?.profilePic || '',
    onlineStatus: 'online',
  });
  
  connectedSockets.push({
    socketId: socket.id,
    userName: socket.userName,
    userId: socket.userId,
  });

  // Notify all other users about online status
  io.emit('user_status_update', {
    userId: socket.userId,
    status: 'online',
  });

  // Send all available offers to the newly connected client
  if (offers.length) {
    socket.emit('availableOffers', offers);
  }

  // Notify other clients about the new connection
  socket.broadcast.emit('user-connected', {
    socketId: socket.id,
    userName: socket.userName,
    userId: socket.userId,
  });

  // Get list of friends who are online
  socket.on('get_online_friends', async (userId) => {
    try {
      const user = await User.findById(userId).populate('friends', '_id');
      const friendIds = user?.friends?.map(f => f._id.toString()) || [];
      
      const onlineFriends = Array.from(activeUsers.values()).filter(
        (user) => friendIds.includes(user.userId) && user.userId !== userId
      );
      
      socket.emit('online_friends_list', onlineFriends);
    } catch (error) {
      console.error('Error getting online friends:', error);
      socket.emit('online_friends_list', []);
    }
  });

  // Event: A client is creating a new offer (starting a call)
  socket.on('newOffer', (newOffer, targetUserId) => {
    console.log(`Received 'newOffer' from ${socket.userName}${targetUserId ? ` to ${targetUserId}` : ''}`);
    
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newOfferObj = {
      callId,
      offererUserName: socket.userName,
      offererUserId: socket.userId,
      offer: newOffer,
      offerIceCandidates: [],
      answererUserName: null,
      answererUserId: null,
      answer: null,
      answererIceCandidates: [],
      socketId: socket.id,
    };
    
    offers.push(newOfferObj);

    // If targetUserId is provided, send only to that user, otherwise broadcast to all
    if (targetUserId) {
      const targetSocket = findUserSocket(targetUserId);
      if (targetSocket) {
        // Store active call
        activeCalls.set(callId, {
          callId,
          callerId: socket.userId,
          calleeId: targetUserId,
          callerSocketId: socket.id,
          calleeSocketId: targetSocket,
          startTime: Date.now(),
          status: 'ringing',
        });
        
        socket.to(targetSocket).emit('newOfferAwaiting', [newOfferObj]);
        socket.emit('call_initiated', { callId });
      } else {
        socket.emit('call_failed', { error: 'User is offline' });
      }
    } else {
      // Send the new offer to all other connected clients (original behavior)
      socket.broadcast.emit('newOfferAwaiting', [newOfferObj]);
    }
  });

  // Event: A client is answering an offer
  socket.on('newAnswer', (offerObj, ackFunction) => {
    console.log(`Received 'newAnswer' from ${socket.userName} for ${offerObj.offererUserName}`);

    // Find the socket of the original offerer
    const socketToAnswer = connectedSockets.find(
      (s) => s.userName === offerObj.offererUserName
    );
    
    if (!socketToAnswer) {
      console.log('Error: Could not find socket for offerer');
      return;
    }

    // Find the offer in our 'offers' array to update
    const offerToUpdate = offers.find(
      (o) => o.offererUserName === offerObj.offererUserName
    );
    
    if (!offerToUpdate) {
      console.log('Error: Could not find offer to update');
      return;
    }

    // Send back any ICE candidates the offerer has already sent
    ackFunction(offerToUpdate.offerIceCandidates);

    // Update the offer with the answerer's info
    offerToUpdate.answer = offerObj.answer;
    offerToUpdate.answererUserName = socket.userName;
    offerToUpdate.answererUserId = socket.userId;

    // Emit the completed offer (with answer) back to the original offerer
    socket.to(socketToAnswer.socketId).emit('answerResponse', offerToUpdate);
  });

  // Event: A client is sending an ICE candidate
  socket.on('sendIceCandidateToSignalingServer', (iceCandidateObj) => {
    const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;

    if (didIOffer) {
      // This candidate is from the OFFERER
      const offerInOffers = offers.find((o) => o.offererUserName === iceUserName);
      
      if (offerInOffers) {
        offerInOffers.offerIceCandidates.push(iceCandidate);

        // If the answerer has already joined, relay this candidate to them immediately
        if (offerInOffers.answererUserName) {
          const socketToSendTo = connectedSockets.find(
            (s) => s.userName === offerInOffers.answererUserName
          );
          
          if (socketToSendTo) {
            socket
              .to(socketToSendTo.socketId)
              .emit('receivedIceCandidateFromServer', iceCandidate);
          }
        }
      }
    } else {
      // This candidate is from the ANSWERER
      const offerInOffers = offers.find((o) => o.answererUserName === iceUserName);
      
      if (offerInOffers) {
        // Store the candidate
        offerInOffers.answererIceCandidates.push(iceCandidate);
        
        const socketToSendTo = connectedSockets.find(
          (s) => s.userName === offerInOffers.offererUserName
        );
        
        if (socketToSendTo) {
          socket
            .to(socketToSendTo.socketId)
            .emit('receivedIceCandidateFromServer', iceCandidate);
        }
      }
    }
  });

  // Event: Call ended
  socket.on('call-ended', async (data) => {
    console.log(`Call ended by ${socket.userName}`);
    
    // Remove offer from the list
    const offerIndex = offers.findIndex(
      (o) => o.offererUserName === socket.userName || o.answererUserName === socket.userName
    );
    
    if (offerIndex > -1) {
      const removedOffer = offers.splice(offerIndex, 1)[0];
      
      // Save call history if we have call data
      if (data?.callId) {
        const call = activeCalls.get(data.callId);
        if (call) {
          await saveCallHistory({
            callId: data.callId,
            callerId: call.callerId,
            calleeId: call.calleeId,
            startTime: call.startTime,
            endTime: Date.now(),
            duration: Date.now() - call.startTime,
            status: 'completed',
          });
          activeCalls.delete(data.callId);
        }
      }
      
      // Notify all clients that this call is ended
      io.emit('offer-removed', removedOffer);
    }
  });

  // Event: A client has disconnected
  socket.on('disconnect', async () => {
    console.log(`User ${socket.userName} disconnected (${socket.id})`);
    
    // Get user data before removing
    const userData = activeUsers.get(socket.id);
    
    // Remove user from activeUsers
    activeUsers.delete(socket.id);
    
    // Remove user from connected sockets list
    const index = connectedSockets.findIndex((s) => s.socketId === socket.id);
    if (index > -1) {
      connectedSockets.splice(index, 1);
    }

    // Notify others about offline status
    if (userData) {
      io.emit('user_status_update', {
        userId: userData.userId,
        status: 'offline',
      });
    }

    // End any active calls for this user
    for (const [callId, call] of activeCalls) {
      if (call.callerSocketId === socket.id || call.calleeSocketId === socket.id) {
        const otherSocketId = call.callerSocketId === socket.id 
          ? call.calleeSocketId 
          : call.callerSocketId;

        io.to(otherSocketId).emit('call_ended', {
          callId,
          reason: 'user_disconnected',
        });
        
        // Save call history
        await saveCallHistory({
          callId,
          callerId: call.callerId,
          calleeId: call.calleeId,
          startTime: call.startTime,
          endTime: Date.now(),
          duration: Date.now() - call.startTime,
          status: 'missed',
        });

        activeCalls.delete(callId);
      }
    }

    // Find any offer this user created and remove it
    const offerIndex = offers.findIndex((o) => o.offererUserName === socket.userName);
    if (offerIndex > -1) {
      console.log(`Removing offer from disconnected user: ${socket.userName}`);
      const removedOffer = offers.splice(offerIndex, 1)[0];
      
      // Notify all remaining clients that this offer is gone
      socket.broadcast.emit('offer-removed', removedOffer);
    }

    // Notify other clients about the disconnection
    socket.broadcast.emit('user-disconnected', {
      userName: socket.userName,
      userId: socket.userId,
    });
  });
});

// Helper function to find user socket by userId
function findUserSocket(userId) {
  for (const [socketId, userData] of activeUsers) {
    if (userData.userId === userId) {
      return socketId;
    }
  }
  return null;
}

// Save call history to database
async function saveCallHistory(callData) {
  try {
    const callHistory = new CallHistory(callData);
    await callHistory.save();
    console.log('Call history saved:', callData);
  } catch (error) {
    console.error('Error saving call history:', error);
  }
}

const startSocketServer = (PORT, HOST = '0.0.0.0') => {
  try {
    httpServer.listen(PORT, HOST, () => {
      console.log(`WebRTC Signaling server listening on http://${HOST}:${PORT}`);
      console.log(`Local access: http://localhost:${PORT}`);
      if (HOST === '0.0.0.0') {
        const os = require('os');
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
              console.log(`Network access: http://${iface.address}:${PORT}`);
              break;
            }
          }
        }
      }
    });
    
    httpServer.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop the other process or use a different port.`);
      } else {
        console.error('Socket server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    console.error('Error starting socket server:', error);
    process.exit(1);
  }
};

module.exports = { io, startSocketServer };
