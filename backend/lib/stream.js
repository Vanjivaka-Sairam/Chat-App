const {StreamChat} = require("stream-chat");

const apiKey = process.env.STREAM_API_KEY;
const apiSecret = process.env.STREAM_API_SECRET;

if(!apiKey || !apiSecret){
    console.error("Stream key or secret is missing");
}

const streamClient = StreamChat.getInstance(apiKey, apiSecret);

const upsertStreamUser = async (userData) => {
    try{
        await streamClient.upsertUsers([userData]);
        return userData;
    }
    catch(error){
        console.error("Error upserting stream user", error);
    }
};

const generateStreamToken = (userId) => {
    try{
        const userIdStr = userId.toString();
        return streamClient.createToken(userIdStr);
    }
    catch(error){
        console.error("error generating stream token", error);
    }
}

module.exports = {upsertStreamUser};