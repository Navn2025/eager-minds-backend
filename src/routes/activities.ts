import { Router } from "express";
import {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity,
} from "../controllers/activityController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getActivities);
router.get("/:id", getActivity);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  createActivity,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  updateActivity,
);
router.delete("/:id", authenticate, requireRole("admin"), deleteActivity);

export default router;
