import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";

export async function getFAQs(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const where: Record<string, unknown> = {};
    if (category) where.category = category;

    const faqs = await prisma.fAQ.findMany({
      where,
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });

    res.json(faqs);
  } catch (error) {
    console.error("GetFAQs error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createFAQ(req: Request, res: Response): Promise<void> {
  try {
    const { question, answer, category, sortOrder } = req.body;
    const faq = await prisma.fAQ.create({
      data: { question, answer, category, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(faq);
  } catch (error) {
    console.error("CreateFAQ error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateFAQ(req: Request, res: Response): Promise<void> {
  try {
    const { question, answer, category, sortOrder } = req.body;
    const data: Record<string, unknown> = {};
    if (question) data.question = question;
    if (answer) data.answer = answer;
    if (category) data.category = category;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const faq = await prisma.fAQ.update({ where: { id: req.params.id }, data });
    res.json(faq);
  } catch (error) {
    console.error("UpdateFAQ error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteFAQ(req: Request, res: Response): Promise<void> {
  try {
    await prisma.fAQ.delete({ where: { id: req.params.id } });
    res.json({ message: "FAQ deleted" });
  } catch (error) {
    console.error("DeleteFAQ error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
