const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
    category:{
        type:String,
        required:true
    },
    title:{
        type:String,
        required:true
    },
    content:{
        type:String,
        required:true
    },
    image:{
        type: String,
        required: true,
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
},{timestamps:true});

const blogPost = mongoose.model('blogPost',blogSchema);
module.exports = blogPost;