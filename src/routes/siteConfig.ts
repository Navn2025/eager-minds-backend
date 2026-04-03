import { Router } from "express";
import { getNavbarFeaturedImages } from "../controllers/siteConfigController.js";

const router = Router();

router.get("/navbar-images", getNavbarFeaturedImages);

export default router;
