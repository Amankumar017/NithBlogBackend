const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const app =express();
const userRouter =require('./Routers/userRouter');
const blogRouter = require('./Routers/blogRouter');
// const Blog = require('./models/blogmodel');


app.use(cors({
    origin: 'https://nithblog.netlify.app', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true, 
}));
app.use(express.json());
dotenv.config();

mongoose.connect(process.env.URL)
.then(()=>{
    console.log("Database connection successful");
    app.listen(process.env.PORT || 8000,(err)=>{
        if(err){
            console.log(err);
        }
        console.log(`server is listening at ${process.env.PORT}`);
    });
})
.catch((error)=>{
    console.log("error",error);
})

app.use(userRouter);
app.use(blogRouter);

// Serve static files from the "uploads" directory
app.use('/uploads', express.static('uploads'));
app.use('/image', express.static('image'));
// app.use(Blog);
