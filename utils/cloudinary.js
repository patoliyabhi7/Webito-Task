const cloudinary = require('cloudinary').v2;
const fs = require('fs');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.uploadOnCloudinary = async function (localFilePath) {
    try {
        if (!localFilePath) return null;

        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has uploaded to cloudinary so remove the locally saved temp file
        fs.unlinkSync(localFilePath)

        console.log("file has been uploaded to cloudinary", response.url);
        return response;
    } catch (error) {
        // remove the locally saved temp file as upload operation got failed
        fs.unlinkSync(localFilePath)
        console.log("error", error)
        return null;
    }
}