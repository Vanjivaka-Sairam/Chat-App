const User = require("../models/user.model");
const jwt = require("jsonwebtoken");


const signup = async (req, res) =>{
    try{
        const {email, password, fullName} = req.body;
        if(!email || !password || !fullName){
            return res.status(400).json({mssg : "All fields are required"});
        }

        if(password.length < 6){
            return res.status(400).json({mssg : "Password must be atleast six characters long"});
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if(!emailRegex.test(email)){
            return res.status(400).json({mssg : "Enter a valid email"});
        }

        const exists = await User.findOne({email});
        
        if(exists){
            return res.status(400).json({mssg : "Email already used. Try with a new one"});
        }

        const idx = Math.floor(Math.random() * 1000) + 1;
        const avatar = `https://api.dicebear.com/9.x/glass/svg?seed=${idx}`;

        const newUser = await User.create({
            email,
            password,
            fullName,
            profilePic : avatar
        })

        const token = jwt.sign({userId : newUser._id}, process.env.JWT_SECRET_KEY, {
            expiresIn : "7d"
        });

        res.cookie("jwt", token, {
            maxAge : 7 * 24 * 60 * 60 * 1000,
            httpOnly : true,
            sameSite : "strict",
            secure : process.env.NODE_ENV === "production"
        })

        res.status(201).json({success : true, user : newUser});

    }catch(error){
        console.log("error in signup controller", error);
        res.status(500).json({mssg : "Internal Server Error"});
    }
  
}

const login = async (req, res) =>{
    
}

const logout = async (req, res) =>{
    
}

module.exports = {signup, login, logout};