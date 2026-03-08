import { v2 as cloudinary } from "cloudinary";
export interface UploadResult {
    secure_url: string;
    public_id: string;
}
export declare const uploadToCloudinary: (filePath: string, folder?: string) => Promise<UploadResult>;
export declare const uploadBufferToCloudinary: (buffer: Buffer, folder?: string, resourceType?: "image" | "raw") => Promise<UploadResult>;
export declare const deleteFromCloudinary: (publicId: string) => Promise<void>;
export default cloudinary;
