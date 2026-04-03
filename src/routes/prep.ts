import { Router } from "express";
import {
  getSubjects,
  createSubject,
  deleteSubject,
  getTopics,
  createTopic,
  deleteTopic,
  getWorksheets,
  getAllWorksheets,
  createWorksheet,
  deleteWorksheet,
  updateWorksheet,
  completeWorksheet,
  getWordOfTheDay,
  listWordArchive,
  createWordOfTheDay,
  listVocabularyWords,
  deleteVocabularyWord,
  updateVocabularyWord,
  getUserDashboard,
  getUserProgress,
} from "../controllers/prepController.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Subjects
router.get("/subjects", getSubjects);
router.post("/subjects", authenticate, requireRole("admin"), createSubject);
router.delete(
  "/subjects/:id",
  authenticate,
  requireRole("admin"),
  deleteSubject,
);

// Topics
router.get("/subjects/:subjectSlug/topics", getTopics);
router.post("/topics", authenticate, requireRole("admin"), createTopic);
router.delete("/topics/:id", authenticate, requireRole("admin"), deleteTopic);

// Worksheets
router.get("/worksheets", authenticate, getAllWorksheets);
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
router.put(
  "/worksheets/:id",
  authenticate,
  requireRole("admin"),
  upload.fields([
    { name: "pdf", maxCount: 1 },
    { name: "answer", maxCount: 1 },
  ]),
  updateWorksheet,
);
router.patch("/worksheets/:id/complete", authenticate, completeWorksheet);

// Word of the Day
router.get("/word-of-the-day", getWordOfTheDay);
router.get("/word-of-the-day/archive", listWordArchive);
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
router.post(
  "/vocabulary",
  authenticate,
  requireRole("admin"),
  createWordOfTheDay,
);
router.put(
  "/vocabulary/:id",
  authenticate,
  requireRole("admin"),
  updateVocabularyWord,
);
router.delete(
  "/vocabulary/:id",
  authenticate,
  requireRole("admin"),
  deleteVocabularyWord,
);

// Dashboard
router.get("/dashboard", authenticate, getUserDashboard);
router.get("/progress", authenticate, getUserProgress);

export default router;
