import type { Request, Response } from "express";
export declare function getSiteImages(_req: Request, res: Response): Promise<void>;
export declare function uploadSiteImage(req: Request, res: Response): Promise<void>;
export declare function removeSiteImage(req: Request, res: Response): Promise<void>;
