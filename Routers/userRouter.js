const express = require('express');
const Router = express.Router();
const User = require('../models/userModel');
const mongoose = require('mongoose');
const bcrypt =require('bcrypt');
const jwt = require('jsonwebtoken');

const authenticateUser = require('../middleware/authenticateUser');
const multer = require('multer');
const path = require('path');

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/'); // Specify the directory where the uploaded files will be stored
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extname = path.extname(file.originalname);
      const newFileName =file.fieldname + '-' + uniqueSuffix + extname;
      cb(null, newFileName); // Use a unique filename for each uploaded file
    },
});


// Create multer instance
const upload = multer({ storage:storage });

// Router.get('/',async (req,res) => {
//     try{
//         res.send('how are you ');

//     }catch(error){
//         console.log(error);
//     }
//     // res.send("api is running");
// });


Router.post('/login', async (req,res)=>{
    const {email,password} = req.body;
    console.log({email});
    console.log({password});

    try{
        const isUser = await User.findOne({email});
        if(!isUser){
            return res.status(401).json({ message: 'Invalid Email' });
        }
        const isCorrectPassword = await bcrypt.compare(password,isUser.password);
        console.log(isCorrectPassword);
        if(!isCorrectPassword){
            return res.status(401).json({message: 'Invalid password'});
        }

        // Password is valid, continue with authentication and token generation
        const token = jwt.sign({ userId: isUser._id }, process.env.JWT_SECRET_KEY, { expiresIn: process.env.JWT_EXPIRES_IN });
        res.status(201).json({token});

        console.log('Login Authentication successful');
    }
    catch(error){
        res.status(500).json({ message: 'Internal server error' });
    }
});

Router.patch('/update-password', async(req,res)=>{
    try{
        console.log('updatedPassword is called')
        const resetToken = req.query.token;
        let userId;
        console.log('updatepasswordresetToken',resetToken);
        jwt.verify(resetToken, process.env.JWT_SECRET_KEY,(error,decoded)=>{
            if(error){
                console.log('here is error',error.message);
            }
            console.log('here is decode value',decoded);
            userId = decoded.userId;
        });
        
        console.log('userId',userId);
        const {newPassword} = req.body;
        // Number of salt rounds for bcrypt hashing (10 is a good balance between security and performance) that's why i set this to 10
        const saltRounds=10;
        const hashedPassword= await bcrypt.hash(newPassword,saltRounds);
        // Update the user's password in the database
        const updatedPasswordData = await User.findByIdAndUpdate(
            userId,
            { password: hashedPassword },
            { new: true },
        );
        console.log('updatedPasswordData',updatedPasswordData);
        res.status(201).json(updatedPasswordData);
    }catch(error){
        console.log({error:error.message});
    }
});

Router.get('/writer-details/:authorId',async(req,res)=>{
    console.log('writer-details is called');
    try{
        const authorId = req.params.authorId;
        const data = await User.findById(authorId);
        res.status(200).json(data);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/user-profile',authenticateUser,async(req,res)=>{
    try{
        console.log('userprofile authenticateUser is called')
        const authorId = req.userId;
        console.log('authorId',authorId);
        const data = await User.findById(authorId);
        res.status(201).json(data);
    }
    catch{
        res.status(400).json({error:error.message});
    }
});

Router.patch('/update-profile',authenticateUser, async (req, res) => {
    try {
        // Destructure field and value directly from req.body
        const { field, value } = req.body;

        console.log('Request Body:', req.body);  // Log the request body
        console.log({field});
        console.log({value});
        // Check if both field and value are provided
        if (!field || !value) {
            return res.status(400).json({ error: 'Field and value are required.' });
        }
        const userId = req.userId; 
        console.log({ userId });
        
        // Update the user document with the specified field and value
        const updatedUser = await User.findByIdAndUpdate(userId, { [field]: value }, { new: true });
        
        // If no user is found with the given userId
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found.' });
        }
        
        // Send back the updated user object
        return res.status(200).json(updatedUser);
    } catch (error) {
        // Log and send internal server error in case of any unexpected errors
        console.error('Error updating profile:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

Router.patch('/update-profile-pic',authenticateUser, upload.single('profilePic') ,async (req , res) => {
    try{
        console.log('updatedprofilepic called the authenticateUser')
        if(!req.file){
            return res.status(400).json({ message: 'No image file provided' });
        }
        const authorId = req.userId;
        console.log('authorId',authorId);
        const data = await User.findById(authorId);
        console.log('data',data);
        // console.log('req.file',req.file);
        console.log('image', req.file.path);
        const imageUrl=req.file.path;
        const imageUrlFormatted = imageUrl.replace(/\\/g, '/');
        const updateUser = await User.findByIdAndUpdate(authorId, { image: imageUrlFormatted},  { new: true });
        res.status(200).json(updateUser);
    }
    catch(error){
        console.log('yes i am here');
        res.status(400).json({error:error.message});
    }
});

Router.post('/verify-email', async(req,res)=>{
    try{
        const {name,email,password}= req.body;
        const addUser = {name,email,password};
        console.log('Received Data of New User in Backend',addUser);

        //Encrypt the data
        const iv = crypto.randomBytes(16); // Initialization Vector
        const secret = process.env.ENCRYPT_SECRET;
        let key = crypto.createHash('sha256').update(String(secret)).digest('base64').slice(0, 32);
        const cipher = crypto.createCipheriv('aes-256-cbc',key, iv);
        let encrypted = cipher.update(JSON.stringify(addUser), 'utf8', 'hex');
        encrypted += cipher.final('hex');

        //created the email verification token
        const emailVerifyToken = jwt.sign({action:'verify_token',email: email},process.env.JWT_SECRET_KEY,{ expiresIn: '24h' });

        // Created a Nodemailer transport with Gmail SMTP settings
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: '20dcs017@nith.ac.in',
                pass: process.env.EMAIL_PASS ,
            }
        });  

        // Defined the reset URL 
        const resetUrl =  process.env.BASE_URL + `email-verified?encryptedData=${encrypted}&token=${emailVerifyToken}&ivHex=${iv.toString('hex')}`;
        const emailContent = ( 
            `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style type='text/css'>
                        *{
                            margin:0;
                            padding:0;
                        }
                        .verify{
                            width:50%;
                            margin:auto;
                        }
                        .verify-h1{
                            margin-top:20px;
                        }
                        .div-p{
                            font-size:17px;
                            padding:40px 0px; 
                        }
                        .verify-button{
                            display:inline-block;
                            font-size:17px;
                            background-color:black;
                            color:white !important;
                            text-decoration:none;
                            padding:13px 30px;
                            border-radius:24px;
                        }
                        .verify-div2{
                            position:relative;padding:40px 0px;border-top:2px solid #B2BABB
                        }
                        .verify-p{
                            font-size:17px;
                        }
                        .verify-team{
                            margin-top:20px;
                            text-align:center;
                            color:#909090;
                        }

                        @media (min-width:320px) and (max-width:480px){
                            .verify{
                                width:100%;
                                padding:15px;
                            }
                        }

                    </style>
                </head>
                <body>
                    <div class='verify'>
                        <h1 class='verify-h1'>Welcome to Nith-Blog</h1>
                        <div class='verify-div1'>
                            <p class='div-p'>
                                Please click the link below to verify your email address.
                            </p>
                            <a class='verify-button' href='${resetUrl}'>
                            Verify email
                            </a>
                            <p class='div-p'>
                                The link is valid for 24 hours.
                            </p>
                        </div>
                        <div class='verify-div2'>
                            <p class='verify-p'>All the best,</p>
                            <p class='verify-p'>The Nith-Blog team</p>
                        </div>
                        <p class='verify-team'>
                        Nith-Blog | Terms of use | Privacy policy
                        </p>
                    </div>
                </body>
            </html>`
        );
        
        // Send the verification email to the user's email address
        await transporter.sendMail({
            from: '20dcs017@nith.ac.in',
            to: email,
            subject: 'Email verification Request', 
            html: emailContent,
        });

        res.status(200).json({message:'verification Email sent successfully'});
    }catch(error){
        return res.status(400).json({error:error.message});
    }
});


Router.get('/register',async (req,res)=>{
    try{
        const emailVerifyToken = req.query.token;
        const decoded = jwt.verify(emailVerifyToken, process.env.JWT_SECRET_KEY);
        if(decoded.action!=='verify_token'){
            return res.status(400).json({ success: false, message: 'Invalid token action' });
        }

        // Check token expiry
        const currentTimeInSeconds = Math.floor(Date.now() / 1000);
        if (currentTimeInSeconds > decoded.exp) {
            return res.status(400).json({ success: false, message: 'Token has expired' });
        }

        //Decrypt the user data to registration
        const encryptedData = req.query.encryptedData;
        const iv = req.query.ivHex;
        const iv_val= Buffer.from(iv, 'hex');
        const secret = process.env.ENCRYPT_SECRET;
        let key = crypto.createHash('sha256').update(String(secret)).digest('base64').slice(0, 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc',key, iv_val);
        let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');


        const {name,email,password} = JSON.parse(decrypted);
        console.log({name,email,password});

        const existingUser = await User.findOne({email});
        if (existingUser) {
            console.log(existingUser);
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const UserAdded = await User.create({
            name:name,
            email:email,
            password:hashedPassword,
        });
        console.log(UserAdded);
        res.status(201).json(UserAdded);
    }
    catch(error){
        res.status(400).json({error: error.message});
    }
});

Router.post('/forgot-password',async(req,res)=>{
    try{
        console.log('req.body',req.body);
        const {email}=req.body;
        console.log('email',{email});
        const user = await User.findOne({email});
        console.log('useridprovided',user._id);
        const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: Date.now() + 3600000 });

        // Created a Nodemailer transport with Gmail SMTP settings
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: '20dcs017@nith.ac.in',
                pass: process.env.EMAIL_PASS ,
            }
        });  

        // Defined the reset URL 
        const resetUrl =  process.env.BASE_URL + `reset-password?token=${resetToken}`;
        const emailContent = ( 
            `<!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style type='text/css'>
                        *{
                            padding:0;
                            margin:0;
                        }
                        .f-forgot{
                            width:50%;
                            margin:auto;
                        }
                        .f-heading{
                            margin-top:20px;
                        }
                        .f-p{
                            font-size:17px;
                            padding:40px 0px;
                        }
                        .f-button{
                            display:inline-block;
                            font-size:17px;
                            background-color:black;
                            color:white !important;
                            text-decoration:none;
                            padding:13px 30px;
                            border-radius:24px; 
                        }
                        .f-team{
                            position:relative;
                            padding:40px 0px;
                            border-top:2px solid #B2BABB
                        }
                        .teamp-p{
                            font-size:17px;
                        }
                        .f-f-p{
                            margin-top:20px;
                            text-align:center;
                            color:#909090;
                        }

                        @media (min-width:320px) and (max-width:480px){
                            .f-forgot{
                                width:100%;
                                padding:15px;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class='f-forgot'>
                        <h1 class='f-heading'>Forgot your Password?</h1>
                        <div class='f-content'>
                            <p class='f-p'>
                                Click the link below to reset the password
                            </p>
                            <a class='f-button' href='${resetUrl}'>
                            Reset password
                            </a>
                            <p class='f-p'>
                            If you didn't request a password reset you can delete this email
                            </p>
                        </div>
                        <div class='f-team'>
                            <p class='team-p'>All the best,</p>
                            <p class='team-p'>The Nith-Blog team</p>
                        </div>
                        <p class='f-f-p'>
                        Nith-Blog | Terms of use | Privacy policy
                        </p>
                    </div>
                </body>
            </html>`
        );
        
        // Send the reset email to the user's email address
        transporter.sendMail({
            from: 'amankumar16102@gmail.com',
            to: email,
            subject: 'Password Reset Request', 
            html: emailContent,
        });
        res.status(200).json({ message: 'Password reset email sent successfully.' });
    }catch(error){
        console.log({error:error.message});
    }
});


module.exports = Router;
