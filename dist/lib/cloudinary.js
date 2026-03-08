import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const uploadToCloudinary = async (filePath, folder = "eager-minds") => {
    const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: "auto",
    });
    return {
        secure_url: result.secure_url,
        public_id: result.public_id,
    };
};
export const uploadBufferToCloudinary = async (buffer, folder = "eager-minds", resourceType = "image") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
            folder,
            resource_type: resourceType,
        }, (error, result) => {
            if (error)
                reject(error);
            else if (result) {
                resolve({
                    secure_url: result.secure_url,
                    public_id: result.public_id,
                });
            }
        });
        uploadStream.end(buffer);
    });
};
export const deleteFromCloudinary = async (publicId) => {
    await cloudinary.uploader.destroy(publicId);
};
export default cloudinary;
