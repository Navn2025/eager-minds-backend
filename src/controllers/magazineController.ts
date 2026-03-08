import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";

export async function getMagazines(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );

    const [magazines, total] = await Promise.all([
      prisma.magazine.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: "desc" }, { month: "desc" }],
      }),
      prisma.magazine.count(),
    ]);

    res.json({ magazines, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetMagazines error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getMagazine(req: Request, res: Response): Promise<void> {
  try {
    const magazine = await prisma.magazine.findUnique({
      where: { id: req.params.id },
    });
    if (!magazine) {
      res.status(404).json({ message: "Magazine not found" });
      return;
    }
    res.json(magazine);
  } catch (error) {
    console.error("GetMagazine error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createMagazine(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, month, year } = req.body;
    const file = req.file;

    if (!file) {
      res.status(400).json({ message: "PDF file is required" });
      return;
    }

    const result = await uploadFileToCloud(file, "eager-minds/magazines");

    const magazine = await prisma.magazine.create({
      data: {
        title,
        month: parseInt(month),
        year: parseInt(year),
        pdfUrl: result.secure_url,
      },
    });

    res.status(201).json(magazine);
  } catch (error) {
    console.error("CreateMagazine error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateMagazine(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, month, year } = req.body;
    const file = req.file;
    const data: Record<string, unknown> = {};

    if (title) data.title = title;
    if (month) data.month = parseInt(month);
    if (year) data.year = parseInt(year);
    if (file) {
      const result = await uploadFileToCloud(file, "eager-minds/magazines");
      data.pdfUrl = result.secure_url;
    }

    const magazine = await prisma.magazine.update({
      where: { id: req.params.id },
      data,
    });
    res.json(magazine);
  } catch (error) {
    console.error("UpdateMagazine error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteMagazine(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.magazine.delete({ where: { id: req.params.id } });
    res.json({ message: "Magazine deleted" });
  } catch (error) {
    console.error("DeleteMagazine error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
