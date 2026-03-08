import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";

export async function getProjects(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );

    const [projects, total] = await Promise.all([
      prisma.artsCraftProject.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.artsCraftProject.count(),
    ]);

    res.json({ projects, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetProjects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    const project = await prisma.artsCraftProject.findUnique({
      where: { id: req.params.id },
    });
    if (!project) {
      res.status(404).json({ message: "Project not found" });
      return;
    }
    res.json(project);
  } catch (error) {
    console.error("GetProject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createProject(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, description, instructions, videoUrl } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;

    let images: string[] = [];
    if (files?.length) {
      const uploadPromises = files.map((f) =>
        uploadFileToCloud(f, "eager-minds/arts-craft"),
      );
      const results = await Promise.all(uploadPromises);
      images = results.map((r) => r.secure_url);
    }

    const project = await prisma.artsCraftProject.create({
      data: { title, description, instructions, images, videoUrl },
    });

    res.status(201).json(project);
  } catch (error) {
    console.error("CreateProject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProject(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, description, instructions, videoUrl } = req.body;
    const files = req.files as Express.Multer.File[] | undefined;
    const data: Record<string, unknown> = {};

    if (title) data.title = title;
    if (description) data.description = description;
    if (instructions !== undefined) data.instructions = instructions;
    if (videoUrl !== undefined) data.videoUrl = videoUrl;
    if (files?.length) {
      const uploadPromises = files.map((f) =>
        uploadFileToCloud(f, "eager-minds/arts-craft"),
      );
      const results = await Promise.all(uploadPromises);
      data.images = results.map((r) => r.secure_url);
    }

    const project = await prisma.artsCraftProject.update({
      where: { id: req.params.id },
      data,
    });

    res.json(project);
  } catch (error) {
    console.error("UpdateProject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteProject(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.artsCraftProject.delete({ where: { id: req.params.id } });
    res.json({ message: "Project deleted" });
  } catch (error) {
    console.error("DeleteProject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
