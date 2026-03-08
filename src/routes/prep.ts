import { Router } from "express";
import {
  getSubjects,
  createSubject,
  getTopics,
  createTopic,
  getWorksheets,
  createWorksheet,
  deleteWorksheet,
  completeWorksheet,
  getWordOfTheDay,
  createWordOfTheDay,
  listVocabularyWords,
  deleteVocabularyWord,
  getUserDashboard,
} from "../controllers/prepController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Subjects
router.get("/subjects", getSubjects);
router.post("/subjects", authenticate, requireRole("admin"), createSubject);

// Topics
router.get("/subjects/:subjectSlug/topics", getTopics);
router.post("/topics", authenticate, requireRole("admin"), createTopic);

// Worksheets
router.get("/subjects/:subjectSlug/worksheets", getWorksheets);
router.post(
  "/worksheets",
  authenticate,
  requireRole("admin"),
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "answer", maxCount: 1 },
  ]),
  createWorksheet,
);
router.delete(
  "/worksheets/:id",
  authenticate,
  requireRole("admin"),
  deleteWorksheet,
);
router.patch("/worksheets/:id/complete", authenticate, completeWorksheet);

// Word of the Day
router.get("/word-of-the-day", getWordOfTheDay);
router.post(
  "/word-of-the-day",
  authenticate,
  requireRole("admin"),
  createWordOfTheDay,
);
router.get(
  "/vocabulary",
  authenticate,
  requireRole("admin"),
  listVocabularyWords,
);
router.delete(
  "/vocabulary/:id",
  authenticate,
  requireRole("admin"),
  deleteVocabularyWord,
);

// Dashboard
router.get("/dashboard", authenticate, getUserDashboard);

export default router;
