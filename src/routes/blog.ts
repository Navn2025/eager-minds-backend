import { Router } from "express";
import {
  getPosts,
  getPost,
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/blogController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.get("/", getPosts);
router.get("/admin/all", authenticate, requireRole("admin"), getAllPosts);
router.get("/:id", getPost);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  createPost,
);
router.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  upload.single("image"),
  updatePost,
);
router.delete("/:id", authenticate, requireRole("admin"), deletePost);

export default router;
