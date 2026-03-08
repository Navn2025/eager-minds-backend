import { Router } from "express";
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial, } from "../controllers/testimonialController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/", getTestimonials);
router.post("/", authenticate, requireRole("admin"), createTestimonial);
router.patch("/:id", authenticate, requireRole("admin"), updateTestimonial);
router.delete("/:id", authenticate, requireRole("admin"), deleteTestimonial);
export default router;
