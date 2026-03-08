import type { Request, Response } from "express";
export declare function createEnquiry(req: Request, res: Response): Promise<void>;
export declare function getEnquiries(req: Request, res: Response): Promise<void>;
export declare function deleteEnquiry(req: Request, res: Response): Promise<void>;
