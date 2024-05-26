// module.exports = authenticationUser;
const jwt = require('jsonwebtoken');

// Middleware function for user authentication
const authenticationUser = (req, res, next) => {
    // Check if the Authorization header exists
    const authHeader = req.headers.authorization;
    // console.log('authHeader', authHeader);

    if (authHeader && authHeader.startsWith('Bearer')) {
        // Extract the token from the Authorization header
        const token = authHeader.split(' ')[1];
        // console.log({ token });

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Check token expiry (example)
        jwt.verify(token, process.env.JWT_SECRET_KEY, (error, decoded) => {
            if (error) {
                // console.log('Token verification error:', error.message);
                return res.status(401).json({ message: 'Invalid token' });
            }

            const currentTime = Math.floor(Date.now() / 1000);
            if (decoded.exp < currentTime) {
                return res.status(401).json({ message: 'Token expired' });
            }

            req.userId = decoded.userId;
            next();
        });

    } else {
        // If no token is provided, respond with unauthorized status
        return res.status(401).json({ message: 'Unauthorized' });
    }
};

module.exports = authenticationUser;
