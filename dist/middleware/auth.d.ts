import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction): void;
