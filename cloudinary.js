const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    if (!localFilePath) {
        console.error('No local file path provided');
        return null;
    }

    try {
        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder:'nithblogUploads',
        });

        // Remove the locally saved temporary file
        fs.unlinkSync(localFilePath);
        
        console.log('File uploaded successfully:', response.url);
        return response;
    } catch (error) {
        console.error('Failed to upload file to Cloudinary:', error.message);
        
        // Remove the locally saved temporary file if upload failed
        fs.unlinkSync(localFilePath);

        return null;
    }
};

module.exports = {uploadOnCloudinary} ;
