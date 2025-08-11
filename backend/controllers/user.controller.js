const FriendRequest = require("../models/friendRequest.model");
const User = require("../models/user.model");


const getRecommendedUsers = async (req, res) => {
    try{
        const curUserId = req.user._id;
        const curUser = req.user;

        const recommendedUsers = await User.find({
            $and : [
                {_id : {$ne : curUserId}},
                {_id : {$nin : curUser.friends}},
                {isOnboard : true},
            ],
        });
        res.status(200).json(recommendedUsers);

    }catch(error){
        console.error("Error in getRecommendedUsers controller", error.message)
    }
}

const getMyFriends = async (req, res) => {
    try{
        const user = await findById(req.user._id)
        .select("friends")
        .populate("friends", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json(user.friends);
    }catch(error){
        console.error("Error in getMyFriends controller", error.message);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

const sendFriendrequest = async (req, res) => {
    try{
        const myId = req.user._id;
        const {id : recipientId} = req.params;

        if(myId === recipientId){
            return res.status(404).json({mssg : "You can't send friend request to yourself"});
        }

        const recipient = await User.findById(recipientId);
        if(!recipient){
            return res.status(404).json({mssg : "Recipient not found"});
        }

        if(recipient.friends.includes(myId)){
            return res.status(400).json({mssg : "You are already a friend to this user"});
        }

        const existingRequest = await FriendRequest.findOne({
            $or : [
                {sender : myId, recipient : recipientId},
                {sender : recipientId, recipient : myId},
            ],
        });

        if(existingRequest){
            return res.status(400).json({mssg : "Request already exists"});
        }

        const friendRequest = await FriendRequest.create({
            sender : myId,
            recipient : recipientId,
        });
        res.status(201).json(friendRequest);
    }
    catch(error){
        console.error("Error in sendFriendRequest controller", error.message);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

module.exports  = {getMyFriends, getRecommendedUsers};