import type { Request, Response } from "express";
export declare function getActivities(req: Request, res: Response): Promise<void>;
export declare function getActivity(req: Request, res: Response): Promise<void>;
export declare function createActivity(req: Request, res: Response): Promise<void>;
export declare function updateActivity(req: Request, res: Response): Promise<void>;
export declare function deleteActivity(req: Request, res: Response): Promise<void>;
