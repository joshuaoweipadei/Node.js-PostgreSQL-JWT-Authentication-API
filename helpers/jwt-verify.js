const jwt = require("jsonwebtoken");
const config = require("../config.json");

const verifyToken = async (req, res, next) => {
    const { authorization } = req.headers;

    if(!authorization){
        return res.status(400).json({ message: 'Token not provided' });
    }

    try {
        const decoded = jwt.verify(authorization, config.secret);
        req.user = {
            sub: decoded.id,
            id: decoded.id,
            email: decoded.email
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = verifyToken;