const mongoose = require('mongoose');

//create schema
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        default:'image/defaultImage.png',
    },
    about:{
        type:String,
        default: 'Busy at Blogging',
    },
}, { timestamps: true});


//create model
const User = mongoose.model('User',userSchema);
module.exports = User;