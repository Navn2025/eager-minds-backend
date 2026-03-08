import { Router } from "express";
import {
  getMagazines,
  getMagazine,
  createMagazine,
  updateMagazine,
  deleteMagazine,
} from "../controllers/magazineController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getMagazines);
router.get("/:id", getMagazine);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("pdf"),
  createMagazine,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("pdf"),
  updateMagazine,
);
router.delete("/:id", authenticate, requireRole("admin"), deleteMagazine);

export default router;
