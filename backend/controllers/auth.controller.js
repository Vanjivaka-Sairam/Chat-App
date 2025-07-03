const { upsertStreamUser } = require("../lib/stream");
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

        try{
            await upsertStreamUser({
                id : newUser._id.toString(),
                name : newUser.fullName,
                image : newUser.profilePic || "",
            });
            console.log(`Stream user created for ${newUser.fullName}`);
        }catch(error){
            console.log("Error in creating Stream user :", error);
        }

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
    try{
        const {email, password} = req.body;
        if(!email || !password){
            return res.status(400).json({mssg : "All fields are required"});
        }

        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({mssg : "Invalid email or password"});
        }

        const isPasswordCorrect = await user.matchPassword(password);
        if(!isPasswordCorrect) return res.status(401).json({mssg : "Invalid email or password"});

        const token = jwt.sign({userId : user._id}, process.env.JWT_SECRET_KEY, {
            expiresIn : "7d"
        });

        res.cookie("jwt", token, {
            maxAge : 7 * 24 * 60 * 60 * 1000,
            httpOnly : true,
            sameSite : "strict",
            secure : process.env.NODE_ENV === "production"
        })

        res.status(200).json({success : true, user});

    }catch(error){
        console.log("Error in login controller", error.message);
        res.status(500).json({message : "Internal server error"});
    }
}

const logout = async (req, res) =>{
    res.clearCookie("jwt");
    res.status(200).json({success : true, mssg : "Logout successful"});
}

const onboard = async (req, res) => {
    try{
        const userId = req.user._id;
        const {fullName, bio, nativeLanguage, learningLanguage, location} = req.body;

        if(!fullName || !bio || !nativeLanguage || !learningLanguage || !location){
            return res.status(400).json({
                mssg : "All fields are required",
                missingFields : [
                    !fullName && "fullName",
                    !bio && "bio",
                    !nativeLanguage && "nativeLanguage",
                    !learningLanguage && "learningLanguage",
                    !location && "location",
                ].filter(Boolean)
            });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, {
            ...req.body,
            isOnboard : true,
        },{new : true});

        if(!updatedUser){
            return res.status(404).json({mssg : "User not found"});
        }
        
        try{
            await upsertStreamUser({
                id : updatedUser._id.toString(),
                name : updatedUser.fullName,
                image : updatedUser.profilePic || "",
            });
            console.log("Stream user updated after onboarding for :",updatedUser.fullName );

        }catch(streamError){
            console.log("Error in updating stream user during onboarding");
        }
        res.status(200).json({success : true, user : updatedUser});

    }catch(error){
        console.error("onboarding error", error);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

module.exports = {signup, login, logout, onboard};