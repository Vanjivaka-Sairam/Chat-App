
const {generateStreamToken} = require("../lib/stream");

const genStreamToken = async (req, res) => {
    try{
        const token = generateStreamToken(req.user.id);
        res.status(200).json({token});
    }
    catch(error){
        console.log("Error in getStreamTokenController:", error.message);
        res.status(500).json({mssg : "Internal Server Error"});
    }
}

module.exports = genStreamToken;