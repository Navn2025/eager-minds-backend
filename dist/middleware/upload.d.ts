import multer from "multer";
import { UploadResult } from "../lib/cloudinary.js";
export declare const upload: multer.Multer;
export declare const uploadFileToCloud: (file: Express.Multer.File, folder?: string) => Promise<UploadResult>;
