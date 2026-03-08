import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function getPapers(req: AuthRequest, res: Response): Promise<void>;
export declare function getPaper(req: AuthRequest, res: Response): Promise<void>;
export declare function createPaper(req: Request, res: Response): Promise<void>;
export declare function updatePaper(req: Request, res: Response): Promise<void>;
export declare function deletePaper(req: Request, res: Response): Promise<void>;
export declare function completePaper(req: AuthRequest, res: Response): Promise<void>;
export declare function adminGetPapers(req: Request, res: Response): Promise<void>;
