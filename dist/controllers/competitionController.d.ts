import type { Request, Response } from "express";
export declare function getCompetitions(req: Request, res: Response): Promise<void>;
export declare function getCompetition(req: Request, res: Response): Promise<void>;
export declare function createCompetition(req: Request, res: Response): Promise<void>;
export declare function updateCompetition(req: Request, res: Response): Promise<void>;
export declare function deleteCompetition(req: Request, res: Response): Promise<void>;
