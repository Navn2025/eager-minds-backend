import { Router } from "express";
import {
  getPapers,
  getPaper,
  createPaper,
  updatePaper,
  deletePaper,
  completePaper,
  adminGetPapers,
} from "../controllers/paperController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", authenticate, getPapers);
router.get("/admin/all", authenticate, requireRole("admin"), adminGetPapers);
router.get("/:id", authenticate, getPaper);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "answer", maxCount: 1 },
  ]),
  createPaper,
);
router.put("/:id", authenticate, requireRole("admin"), updatePaper);
router.delete("/:id", authenticate, requireRole("admin"), deletePaper);
router.patch(
  "/:id/complete",
  authenticate,
  requireRole("premium", "admin"),
  completePaper,
);

export default router;
