import type { Request, Response } from "express";
export declare function getProjects(req: Request, res: Response): Promise<void>;
export declare function getProject(req: Request, res: Response): Promise<void>;
export declare function createProject(req: Request, res: Response): Promise<void>;
export declare function updateProject(req: Request, res: Response): Promise<void>;
export declare function deleteProject(req: Request, res: Response): Promise<void>;
