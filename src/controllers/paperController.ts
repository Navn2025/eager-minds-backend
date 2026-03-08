import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadFileToCloud } from "../middleware/upload.js";

export async function getPapers(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (
      !req.user ||
      (req.user.role !== "premium" && req.user.role !== "admin")
    ) {
      res.status(403).json({
        message: "This resource is available only for upgraded members.",
      });
      return;
    }

    const { subjectId, difficulty, page: pageStr, limit: limitStr } = req.query;
    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));

    const where: Record<string, unknown> = {};
    if (subjectId) where.subjectId = subjectId;
    if (difficulty) where.difficulty = difficulty;

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        include: { subject: { select: { name: true, slug: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.paper.count({ where }),
    ]);

    res.json({ papers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetPapers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getPaper(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (
      !req.user ||
      (req.user.role !== "premium" && req.user.role !== "admin")
    ) {
      res.status(403).json({
        message: "This resource is available only for upgraded members.",
      });
      return;
    }

    const paper = await prisma.paper.findUnique({
      where: { id: req.params.id },
      include: { subject: { select: { name: true, slug: true } } },
    });

    if (!paper) {
      res.status(404).json({ message: "Paper not found" });
      return;
    }

    res.json(paper);
  } catch (error) {
    console.error("GetPaper error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createPaper(req: Request, res: Response): Promise<void> {
  try {
    const { title, subjectId, difficulty } = req.body;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const pdfFile = files?.pdf?.[0];
    const answerFile = files?.answer?.[0];

    if (!pdfFile) {
      res.status(400).json({ message: "PDF file is required" });
      return;
    }

    const pdfResult = await uploadFileToCloud(pdfFile, "eager-minds/papers");
    let answerPdfUrl: string | null = null;
    if (answerFile) {
      const answerResult = await uploadFileToCloud(
        answerFile,
        "eager-minds/papers",
      );
      answerPdfUrl = answerResult.secure_url;
    }

    const paper = await prisma.paper.create({
      data: {
        title,
        subjectId,
        difficulty: difficulty || "medium",
        pdfUrl: pdfResult.secure_url,
        answerPdfUrl,
      },
    });

    res.status(201).json(paper);
  } catch (error) {
    console.error("CreatePaper error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updatePaper(req: Request, res: Response): Promise<void> {
  try {
    const { title, subjectId, difficulty } = req.body;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const pdfFile = files?.pdf?.[0];
    const answerFile = files?.answer?.[0];

    const data: Record<string, unknown> = {};
    if (title) data.title = title;
    if (subjectId) data.subjectId = subjectId;
    if (difficulty) data.difficulty = difficulty;
    if (pdfFile) {
      const result = await uploadFileToCloud(pdfFile, "eager-minds/papers");
      data.pdfUrl = result.secure_url;
    }
    if (answerFile) {
      const result = await uploadFileToCloud(answerFile, "eager-minds/papers");
      data.answerPdfUrl = result.secure_url;
    }

    const paper = await prisma.paper.update({
      where: { id: req.params.id },
      data,
    });
    res.json(paper);
  } catch (error) {
    console.error("UpdatePaper error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deletePaper(req: Request, res: Response): Promise<void> {
  try {
    await prisma.paper.delete({ where: { id: req.params.id } });
    res.json({ message: "Paper deleted" });
  } catch (error) {
    console.error("DeletePaper error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function completePaper(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const completion = await prisma.completion.upsert({
      where: {
        userId_itemId_itemType: {
          userId: req.user.id,
          itemId: req.params.id,
          itemType: "paper",
        },
      },
      update: {},
      create: {
        userId: req.user.id,
        itemId: req.params.id,
        itemType: "paper",
      },
    });

    res.json(completion);
  } catch (error) {
    console.error("CompletePaper error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Admin: list all papers without premium restriction
export async function adminGetPapers(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );

    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        include: { subject: { select: { name: true, slug: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.paper.count(),
    ]);

    res.json({ papers, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("AdminGetPapers error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
