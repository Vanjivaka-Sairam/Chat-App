const mongoose = require("mongoose");
const bcrypt = require("bcrypt")
const Schema = mongoose.Schema;


const userSchema =  new Schema({
    fullName : {
        type : String,
        required : true,
    },

    email : {
        type : String,
        required : true,
        unique : true,
    },

    password : {
        type : String,
        required : true,
        minLength : 6,
    },

    bio : {
        type : String,
        default : "",
    },

    profilePic : {
        type : String,
        default : "",
    },

    nativeLanguage : {
        type : String,
        default : "",
    },

    learningLanguage : {
        type : String,
        default : "",
    },

    location : {
        type : String,
        default : "",
    },

    isOnboard : {
        type : Boolean,
        default : false,
    },

    friends : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
    }],
},{timestamps : true});

userSchema.pre("save",async function (next) {
    if(!this.isModified("password"))return next();
    try{
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next()
    }catch(error){
        next(error);
    }
})


const User = mongoose.model("User", userSchema);
module.exports = User;