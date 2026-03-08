import { Router } from "express";
import { getFAQs, createFAQ, updateFAQ, deleteFAQ, } from "../controllers/faqController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router = Router();
router.get("/", getFAQs);
router.post("/", authenticate, requireRole("admin"), createFAQ);
router.put("/:id", authenticate, requireRole("admin"), updateFAQ);
router.delete("/:id", authenticate, requireRole("admin"), deleteFAQ);
export default router;
