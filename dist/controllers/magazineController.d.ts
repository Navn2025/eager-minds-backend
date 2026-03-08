import type { Request, Response } from "express";
export declare function getMagazines(req: Request, res: Response): Promise<void>;
export declare function getMagazine(req: Request, res: Response): Promise<void>;
export declare function createMagazine(req: Request, res: Response): Promise<void>;
export declare function updateMagazine(req: Request, res: Response): Promise<void>;
export declare function deleteMagazine(req: Request, res: Response): Promise<void>;
