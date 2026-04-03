import { Router } from "express";
import { completeQuiz, generateQuiz, getQuizAttempts, getQuizSummary, } from "../controllers/quizController.js";
import { authenticate } from "../middleware/auth.js";
const router = Router();
router.post("/generate", authenticate, generateQuiz);
router.post("/complete", authenticate, completeQuiz);
router.get("/summary", authenticate, getQuizSummary);
router.get("/attempts", authenticate, getQuizAttempts);
export default router;
