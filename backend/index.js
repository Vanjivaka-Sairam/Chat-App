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
app.use(cors({
  origin: "http://localhost:5173",
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
        
        // Start the main API server
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, ()=>{
            console.log(`API server listening on port ${PORT}`);
        })
        
        // Start the WebRTC signaling server on a different port
        const SOCKET_PORT = 3001;
        startSocketServer(SOCKET_PORT);
    } catch (error) {
        console.error('Error starting servers:', error);
        process.exit(1);
    }
}

startServer();

