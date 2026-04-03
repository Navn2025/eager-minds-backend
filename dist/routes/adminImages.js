import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";
import { getSiteImages, uploadSiteImage, removeSiteImage, } from "../controllers/adminImageController.js";
const router = Router();
router.get("/", authenticate, requireRole("admin"), getSiteImages);
router.post("/upload", authenticate, requireRole("admin"), upload.single("image"), uploadSiteImage);
router.delete("/", authenticate, requireRole("admin"), removeSiteImage);
export default router;
