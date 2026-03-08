import type { Request, Response } from "express";
export declare function getEvents(req: Request, res: Response): Promise<void>;
export declare function getEvent(req: Request, res: Response): Promise<void>;
export declare function createEvent(req: Request, res: Response): Promise<void>;
export declare function updateEvent(req: Request, res: Response): Promise<void>;
export declare function deleteEvent(req: Request, res: Response): Promise<void>;
