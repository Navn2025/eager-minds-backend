import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";

export async function getCompetitions(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { status } = req.query;
    const now = new Date();
    const where: Record<string, unknown> = {};

    if (status === "upcoming") where.eventDate = { gte: now };
    else if (status === "past") where.eventDate = { lt: now };

    const competitions = await prisma.competition.findMany({
      where,
      orderBy: { eventDate: "desc" },
    });

    res.json(competitions);
  } catch (error) {
    console.error("GetCompetitions error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getCompetition(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const competition = await prisma.competition.findUnique({
      where: { id: req.params.id },
    });
    if (!competition) {
      res.status(404).json({ message: "Competition not found" });
      return;
    }
    res.json(competition);
  } catch (error) {
    console.error("GetCompetition error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createCompetition(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, description, rules, registrationLink, eventDate } = req.body;
    const file = req.file;

    let imageUrl: string | null = null;
    if (file) {
      const result = await uploadFileToCloud(file, "eager-minds/competitions");
      imageUrl = result.secure_url;
    }

    const competition = await prisma.competition.create({
      data: {
        title,
        description,
        rules,
        image: imageUrl,
        registrationLink,
        eventDate: new Date(eventDate),
      },
    });

    res.status(201).json(competition);
  } catch (error) {
    console.error("CreateCompetition error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateCompetition(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { title, description, rules, registrationLink, eventDate } = req.body;
    const file = req.file;
    const data: Record<string, unknown> = {};

    if (title) data.title = title;
    if (description) data.description = description;
    if (rules !== undefined) data.rules = rules;
    if (registrationLink !== undefined)
      data.registrationLink = registrationLink;
    if (eventDate) data.eventDate = new Date(eventDate);
    if (file) {
      const result = await uploadFileToCloud(file, "eager-minds/competitions");
      data.image = result.secure_url;
    }

    const competition = await prisma.competition.update({
      where: { id: req.params.id },
      data,
    });

    res.json(competition);
  } catch (error) {
    console.error("UpdateCompetition error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteCompetition(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.competition.delete({ where: { id: req.params.id } });
    res.json({ message: "Competition deleted" });
  } catch (error) {
    console.error("DeleteCompetition error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
