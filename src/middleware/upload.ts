import multer from "multer";
import { uploadBufferToCloudinary, UploadResult } from "../lib/cloudinary.js";

// Use memory storage - files go to buffer, then to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF and images are allowed."));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// Helper to upload file buffer to Cloudinary
export const uploadFileToCloud = async (
  file: Express.Multer.File,
  folder: string = "eager-minds",
): Promise<UploadResult> => {
  const isPdf = file.mimetype === "application/pdf";
  return uploadBufferToCloudinary(file.buffer, folder, isPdf ? "raw" : "image");
};
