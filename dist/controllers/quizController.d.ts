import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function generateQuiz(req: AuthRequest, res: Response): Promise<void>;
export declare function completeQuiz(req: AuthRequest, res: Response): Promise<void>;
export declare function getQuizAttempts(req: AuthRequest, res: Response): Promise<void>;
export declare function getQuizSummary(req: AuthRequest, res: Response): Promise<void>;
