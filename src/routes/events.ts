import { Router } from "express";
import {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/eventController.js";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEvent);
router.post("/", authenticate, requireRole("admin"), createEvent);
router.put("/:id", authenticate, requireRole("admin"), updateEvent);
router.delete("/:id", authenticate, requireRole("admin"), deleteEvent);

export default router;
