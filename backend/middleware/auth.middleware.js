const jwt = require("jsonwebtoken");
const User = require("../models/user.model");


const protectRoute = async (req, res, next) => {
    try{
        const token = req.cookies.jwt;
        if(!token){
            return res.status(401).json({mssg : "Unauthorized - No token provided"}); 
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if(!decoded){
            return res.status(401).json({mssg : "Unauthorized - Invalid Token"});
        }
        const user  = await User.findById(decoded.userId).select("-password");
        if(!user){
            return res.status(401).json({mssg : "Unauthorized - User not found"});
        }
        req.user = user;
        next();
    }
    catch(error){
        console.log("Error in protectRoute middleware", error);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

module.exports = protectRoute;