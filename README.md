# MERN Chat Application with WebRTC Video Calls

A full-stack real-time chat application built with the MERN stack, featuring WebRTC video/audio calling, friend management, and real-time messaging capabilities.

## 🚀 Features

- **Real-time Video/Audio Calls**: WebRTC-powered video and audio calling between friends
- **Friend Management**: Send friend requests, manage friends list, and see online status
- **Real-time Messaging**: Chat with friends using Stream Chat integration
- **User Authentication**: Secure JWT-based authentication with cookie management
- **Online Status**: See which friends are online and available for calls
- **Call History**: Track all your video calls with call history
- **Responsive Design**: Modern UI built with Tailwind CSS and DaisyUI
- **Theme Support**: Dark/Light theme support

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)
- Stream Chat account (for messaging features)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Chat
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
# Database
MONGO_URI=your_mongodb_connection_string

# JWT
JWT_SECRET_KEY=your_jwt_secret_key

# Server Configuration
PORT=
HOST=
SOCKET_PORT=

# Frontend URL (for CORS and network access)
FRONTEND_URL=

# Stream Chat (for messaging)
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_URL=

# Socket Configuration
VITE_SOCKET_URL=

# Stream Chat
VITE_STREAM_API_KEY=your_stream_api_key
```

## 🚀 Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```


   ```

2. **Update Backend `.env`:**
   ```env
   FRONTEND_URL=http://YOUR_LOCAL_IP:5173
   HOST=0.0.0.0
   ```

3. **Update Frontend `.env`:**
   ```env
   VITE_API_URL=http://YOUR_LOCAL_IP:5000/api
   VITE_SOCKET_URL=http://YOUR_LOCAL_IP:3001
   ```

4. **Restart both servers**

5. **Access from mobile:**
   - Connect your mobile to the same Wi-Fi network
   - Open `http://YOUR_LOCAL_IP:5173` in your mobile browser
   - Both users can now make video calls!

**For detailed instructions, see [NETWORK_SETUP.md](NETWORK_SETUP.md)**

## 📁 Project Structure

```
Chat/
├── backend/
│   ├── controllers/     # Request handlers
│   ├── models/         # MongoDB models
│   ├── routes/         # API routes
│   ├── middleware/     # Authentication middleware
│   ├── lib/            # Database and utilities
│   ├── socketServer.js # WebRTC signaling server
│   └── index.js        # Entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/ # React components
│   │   ├── context/    # React Context (WebRTC)
│   │   ├── hooks/      # Custom hooks
│   │   ├── lib/        # API and utilities
│   │   ├── pages/      # Page components
│   │   └── store/      # State management
│   └── vite.config.js
│
└── README.md
```

## 🔧 Technology Stack

### Backend
- **Express.js**: Web framework
- **Socket.io**: Real-time WebSocket communication
- **MongoDB**: Database
- **Mongoose**: ODM for MongoDB
- **JWT**: Authentication
- **bcrypt**: Password hashing

### Frontend
- **React**: UI library
- **Vite**: Build tool
- **React Router**: Routing
- **Socket.io-client**: WebSocket client
- **Tailwind CSS**: Styling
- **DaisyUI**: Component library
- **Stream Chat**: Messaging SDK
- **React Query**: Data fetching

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/onboarding` - Complete user onboarding

### Users
- `GET /api/users` - Get recommended users
- `GET /api/users/friends` - Get user's friends
- `POST /api/users/friend-request/:id` - Send friend request
- `PUT /api/users/friend-request/:id/accept` - Accept friend request
- `GET /api/users/friend-requests` - Get friend requests
- `GET /api/users/outgoing-friend-requests` - Get outgoing requests

### Chat
- `GET /api/chat/token` - Get Stream Chat token

## 📱 Usage

1. **Sign Up**: Create a new account
2. **Onboarding**: Complete your profile (languages, bio, location)
3. **Find Friends**: Browse recommended users and send friend requests
4. **Chat**: Start conversations with your friends
5. **Video Calls**: Initiate video or audio calls from the friends list or chat page
6. **Online Status**: See which friends are online and available

