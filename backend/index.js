const express = require('express');
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser")
const cors = require("cors");
dotenv.config();

const authRoutes = require('./routes/auth.routes');
const userRoutes = require("./routes/user.routes");
const chatRoutes = require("./routes/chat.routes");
const connect = require("./lib/db");
const { startSocketServer } = require("./socketServer");

const app = express();

// CORS configuration - allow multiple origins for network access
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

const startServer = async ()=>{
    try {
        await connect();
        
        // Start the main API server - listen on all network interfaces
        const PORT = process.env.PORT || 5000;
        const HOST = process.env.HOST || '0.0.0.0';
        app.listen(PORT, HOST, ()=>{
            console.log(`API server listening on http://${HOST}:${PORT}`);
            console.log(`Local access: http://localhost:${PORT}`);
            console.log(`Network access: http://${getLocalIP()}:${PORT}`);
        })
        
        // Start the WebRTC signaling server on a different port
        const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
        startSocketServer(SOCKET_PORT, HOST);
    } catch (error) {
        console.error('Error starting servers:', error);
        process.exit(1);
    }
}

// Helper function to get local IP address
function getLocalIP() {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip internal (i.e. 127.0.0.1) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

startServer();

