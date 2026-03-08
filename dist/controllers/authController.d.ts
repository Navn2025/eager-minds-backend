import type { Request, Response } from "express";
import type { AuthRequest } from "../middleware/auth.js";
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function getMe(req: AuthRequest, res: Response): Promise<void>;
export declare function listUsers(req: AuthRequest, res: Response): Promise<void>;
export declare function updateUserRole(req: AuthRequest, res: Response): Promise<void>;
export declare function deleteUser(req: AuthRequest, res: Response): Promise<void>;
