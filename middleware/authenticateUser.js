// const jwt = require('jsonwebtoken');

// // middleware funtion for user authentication

// const authenticationUser = (req,res,next) => {
//     // Check if the Authorization header exists
//     const authHeader = req.headers.authorization;
//     console.log('authHeader',authHeader);
//     if (authHeader && authHeader.startsWith('Bearer')) {
//         // Check if the token is provided and valid
//         // const token = authHeader && authHeader.split(' ')[1];
//         const token = authHeader.split(' ')[1];
//         console.log({token});

//         if(!token){
//             return res.status(401).json({message: 'Unauthorized'});
//         }
//         try{
//             //verify and decode the token
//             jwt.verify(token,process.env.JWT_SECRET_KEY, (error,decoded)=>{
//                 if(error){
//                     console.log('problem in this part')
//                     console.log('here is error',error.message);
//                 }
//                 console.log('here is decode value',decoded);

//                 //Attach the decoded user Id to the request object for further use
//                 req.userId = decoded.userId;
//                 console.log('reqUserId', req.userId);
//             });

//             // Proceed to the next middleware or route handler
//             next();
//         }
//         catch(error){
//             console.log({error});
//             return res.status(401).json({message:'Invalid token'});
//         }
//     }

// };


// module.exports = authenticationUser;
const jwt = require('jsonwebtoken');

// Middleware function for user authentication
const authenticationUser = (req, res, next) => {
    // Check if the Authorization header exists
    const authHeader = req.headers.authorization;
    console.log('authHeader', authHeader);

    if (authHeader && authHeader.startsWith('Bearer')) {
        // Extract the token from the Authorization header
        const token = authHeader.split(' ')[1];
        console.log({ token });

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Verify and decode the token
        // jwt.verify(token, process.env.JWT_SECRET_KEY, (error, decoded) => {
        //     if (error) {
        //         console.log('Token verification error:', error.message);
        //         return res.status(401).json({ message: 'Invalid token' });
        //     }

        //     console.log('Decoded token:', decoded);

        //     // Attach the decoded user ID to the request object for further use
        //     req.userId = decoded.userId;
        //     console.log('req.userId', req.userId);

        //     // Proceed to the next middleware or route handler
        //     next();
        // });

        // Check token expiry (example)
        jwt.verify(token, process.env.JWT_SECRET_KEY, (error, decoded) => {
            if (error) {
                console.log('Token verification error:', error.message);
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
