import { Router } from "express";
import { register, login, getMe, listUsers, updateUserRole, deleteUser, } from "../controllers/authController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
// Admin user management
router.get("/users", authenticate, requireRole("admin"), listUsers);
router.patch("/users/:id/role", authenticate, requireRole("admin"), updateUserRole);
router.delete("/users/:id", authenticate, requireRole("admin"), deleteUser);
export default router;
