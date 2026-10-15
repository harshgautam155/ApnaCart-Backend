const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_KEY;

function createToken(user) {
    const payload = {
        _id: user._id,
        email: user.email,
        role: user.role,
        name: user.fullName
    };
    return jwt.sign(payload, SECRET);
}

function validateToken(token){
    return jwt.verify(token, SECRET);
}

module.exports = {
    createToken,
    validateToken
};