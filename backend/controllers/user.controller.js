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
        const user = await User.findById(req.user._id)
        .select("friends")
        .populate("friends", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json(user.friends);
    }catch(error){
        console.error("Error in getMyFriends controller", error.message);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

const sendFriendrequest = async (req, res) => {
    try {
      const myId = req.user._id;            // ObjectId
      const { id: recipientId } = req.params; // string
  
      if (myId.toString() === recipientId) {
        return res.status(400).json({ mssg: "You can't send a friend request to yourself" });
      }
  
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({ mssg: "Recipient not found" });
      }
  
      // Check existing friendship
      const alreadyFriends = (recipient.friends || []).some(fid =>
        fid.toString() === myId.toString()
      );
      if (alreadyFriends) {
        return res.status(400).json({ mssg: "You are already friends with this user" });
      }
  
      // Check existing request in either direction
      const existingRequest = await FriendRequest.findOne({
        $or: [
          { sender: myId, recipient: recipientId },
          { sender: recipientId, recipient: myId },
        ],
      });
  
      if (existingRequest) {
        return res.status(400).json({ mssg: "Request already exists" });
      }
  
      const friendRequest = await FriendRequest.create({
        sender: myId,
        recipient: recipientId,
        // status should default to "pending" in your schema
      });
  
      res.status(201).json(friendRequest);
    } catch (error) {
      console.error("Error in sendFriendRequest controller", error.message);
      res.status(500).json({ mssg: "Internal Server Error" });
    }
  };

const acceptFriendRequest = async (req, res) => {
    try{
        const {id : requestId} = req.params;
        const friendRequest = await FriendRequest.findById(requestId);
        if(!friendRequest){
            return res.status(404).json({mssg : "friend request not found"})
        }

        if(friendRequest.recipient.toString() !== req.user._id.toString()){
            return res.status(403).json({mssg : "You are not authorized to accept this request"});
        }

        friendRequest.status = "accepted";
        await friendRequest.save();

        await User.findByIdAndUpdate(friendRequest.recipient, {
            $addToSet : {friends : friendRequest.sender},
        });

        await User.findByIdAndUpdate(friendRequest.sender, {
            $addToSet : {friends : friendRequest.recipient},
        });

        res.status(200).json({mssg : "Friend request accepted"});
    }
    catch(error){
        console.log("Error in accepting friend request", error.message);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

const getFriendRequests = async (req, res) => {
    try{
        const incomingReqs = await FriendRequest.find({
            recipient : req.user._id,
            status : "pending",
        }).populate("sender", "fullName profilePic nativeLanguage learningLanguage");

        const acceptedReqs = await FriendRequest.find({
            $or: [
                { sender: req.user._id, status: "accepted" },
                { recipient: req.user._id, status: "accepted" }
            ]
        }).populate("sender", "fullName profilePic")
          .populate("recipient", "fullName profilePic");

        res.status(200).json({incomingReqs, acceptedReqs});
    }
    catch(error){
        console.log("Error in getPendingFriendRequests controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }

}

const getOutgoingFriendReqs = async (req, res) =>{
    try{
        const outgoingRequests = await FriendRequest.find({
            sender : req.user._id,
            status : "pending",
        }).populate("recipient", "fullName profilePic nativeLanguage learningLanguage");

        res.status(200).json(outgoingRequests);
        }
        catch(error){
        console.log("Error in getOutgoingFriendReqs controller", error.message);
        res.status(500).json({ message: "Internal Server Error" });
        }
}

module.exports  = {getMyFriends, getRecommendedUsers, sendFriendrequest, acceptFriendRequest, getFriendRequests, getOutgoingFriendReqs};