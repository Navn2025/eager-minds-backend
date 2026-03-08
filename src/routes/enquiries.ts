import { Router } from "express";
import {
  createEnquiry,
  getEnquiries,
  deleteEnquiry,
} from "../controllers/enquiryController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.post("/", createEnquiry);
router.get("/", authenticate, requireRole("admin"), getEnquiries);
router.delete("/:id", authenticate, requireRole("admin"), deleteEnquiry);

export default router;
