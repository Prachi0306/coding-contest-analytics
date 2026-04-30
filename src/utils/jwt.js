const jwt = require('jsonwebtoken');
const config = require('../config');




const generateToken = (payload, options = {}) => {
  const { expiresIn = config.jwtExpiresIn } = options;

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn,
    issuer: 'coding-contest-analytics',
    audience: 'cca-client',
  });
};


const verifyToken = (token) => {
  return jwt.verify(token, config.jwtSecret, {
    issuer: 'coding-contest-analytics',
    audience: 'cca-client',
  });
};


const decodeToken = (token) => {
  return jwt.decode(token);
};


const generateAuthTokens = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    username: user.username,
  };

  const accessToken = generateToken(payload);

  return {
    accessToken,
    tokenType: 'Bearer',
    expiresIn: config.jwtExpiresIn,
  };
};

module.exports = {
  generateToken,
  verifyToken,
  decodeToken,
  generateAuthTokens,
};
