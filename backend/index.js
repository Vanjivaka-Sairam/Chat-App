const express = require('express');
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser")
dotenv.config();

const authRoutes = require('./routes/auth.routes');
const connect = require("./lib/db");

const app = express();
app.use(express.json());
app.use(cookieParser());


app.use('/api/auth', authRoutes);


const startServer = async ()=>{
    await connect();
    app.listen(process.env.PORT, ()=>{
    console.log('Server listening on port 5000');
    })
}

startServer();

