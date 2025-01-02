const authenticateUser = require('../middleware/authenticateUser');
const express = require('express');
const blogPost = require('../models/blogmodel');
const User = require('../models/userModel');
const Router = express.Router();
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');
const fs = require('fs');

Router.use(express.urlencoded({extended:false}));
const { uploadOnCloudinary } = require('../cloudinary');

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


Router.post('/create-post',authenticateUser, upload.single('myImage') ,async (req , res) => {
    try{
        console.log('createpost has called the authenticated User');
        if(!req.file){
            return res.status(400).json({ message: 'No image file provided' });
        }
        const {category,title,content}=req.body;
        // console.log({category});
        // console.log({title});
        // console.log({content});
        
        const authorId = req.userId;
        // console.log({authorId});
        const imageUrl=req.file.path;
        console.log({imageUrl});
        const updatedImage = await uploadOnCloudinary(imageUrl);
        console.log({updatedImage});
        if (!updatedImage) {
            throw new ApiError(400, "updatedImage file is required")
        } 
        const createBlog = await blogPost.create({
            category:category,
            title:title,
            content:content,
            image:updatedImage.url,
            author:authorId
        });
        
        res.status(201).json(createBlog);
    }
    catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.patch('/update-post/:postId', authenticateUser, upload.single('myImage'), async (req, res) => {
    try {
        const postId = req.params.postId;
        const { category, title, content } = req.body;

        // Find the post by ID
        const existingPost = await blogPost.findById(postId);

        if (!existingPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Check if the user is the author of the post
        if (existingPost.author.toString() !== req.userId) {
            return res.status(403).json({ message: 'Unauthorized: You are not the author of this post' });
        }

        // Update the post fields
        if (category) existingPost.category = category;
        if (title) existingPost.title = title;
        if (content) existingPost.content = content;

        // Check if the request contains an image file
        if (req.file) {
            const imageUrl=req.file.path;
            const updatedImage = await uploadOnCloudinary(imageUrl);
            
            if (!updatedImage) {
                throw new ApiError(400, "updatedImage file is required")
            } 
            // Update the image path in the database
            existingPost.image =updatedImage.url;
        }

        // Save the updated post
        const updatedPost = await existingPost.save();

        res.status(200).json(updatedPost);
    } catch (error) {
        // console.error('Error updating post:', error);
        res.status(400).json({ error: error.message });
    }
});


Router.get('/all-post',async (req,res) =>{
    console.log('allpost backend is called')
    try{
        const allPost = await blogPost.aggregate([
            {
              $match: { author: { $exists: true } }
            },
            {
              $lookup: {
                from: 'users',
                localField: 'author',
                foreignField: '_id',
                as: 'authorDetails',
              }
            },
            {
              $unwind: '$authorDetails'
            }
        ]);
        res.status(201).json(allPost);
    }catch(error){
        res.status(400).json({message:error.message});
    }
});

Router.get('/my-post',authenticateUser,async(req,res)=>{
    try{
        const authorId=req.userId;
        const mypost = await blogPost.find({author:authorId});
        res.status(201).json(mypost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/fullPost/:id', async(req,res) =>{
    try{
        const blogId= req.params.id;
        const blogDetail= await blogPost.findById(blogId);
        if(!blogDetail){
            return res.status(404).json({message:'blog not found'});
        }
        const authorDetail= await User.findById(blogDetail.author);
        res.status(200).json({ blogDetail, authorDetail});
    }catch(error){
        res.status(500).json({ message: error.message });
    }
});

Router.get('/authorBlog/:id', async (req, res) => {
    try {
      const AuthorId = req.params.id;
    //   console.log({AuthorId});
      const AuthorDetail = await User.findById(AuthorId);
      if (!AuthorDetail) {
        return res.status(404).json({ message: 'Author not found' });
      }
  
      const blogs = await blogPost.find({author:AuthorId});
  
      res.status(200).json({ AuthorDetail, blogs });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

Router.get('/college-post',async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'College', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const collegepost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(collegepost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/hillfair-post',async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'Hillfair', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const hillfairpost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(hillfairpost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/nimbus-post',async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'Nimbus', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const nimbuspost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(nimbuspost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/sports-post', async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'Sports', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const sportspost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(sportspost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/events-post', async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'Events', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const eventspost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(eventspost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
});

Router.get('/others-post', async(req,res)=>{
    try{
        const aggregationStages = [
            { $match: { category: 'others', author: { $exists: true } } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'author',
                    foreignField: '_id',
                    as: 'authorDetails',
                }
            },
            { $unwind: '$authorDetails' }
        ];
        const othersPost = await blogPost.aggregate(aggregationStages);
        res.status(201).json(othersPost);
    }catch(error){
        res.status(400).json({error:error.message});
    }
})

module.exports = Router;