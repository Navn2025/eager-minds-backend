import { Router } from "express";
import {
  getCompetitions,
  getCompetition,
  createCompetition,
  updateCompetition,
  deleteCompetition,
} from "../controllers/competitionController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getCompetitions);
router.get("/:id", getCompetition);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  createCompetition,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  updateCompetition,
);
router.delete("/:id", authenticate, requireRole("admin"), deleteCompetition);

export default router;
