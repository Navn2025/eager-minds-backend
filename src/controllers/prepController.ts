import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import type { AuthRequest } from "../middleware/auth.js";
import { uploadFileToCloud } from "../middleware/upload.js";

// Subjects
export async function getSubjects(req: Request, res: Response): Promise<void> {
  try {
    const includeFull = req.query.include === "full";

    const subjects = await prisma.subject.findMany({
      include: includeFull
        ? {
            _count: { select: { topics: true, worksheets: true } },
            topics: {
              include: {
                worksheets: {
                  select: {
                    id: true,
                    title: true,
                    pdfUrl: true,
                    answerPdfUrl: true,
                    difficulty: true,
                  },
                  orderBy: { createdAt: "desc" },
                },
              },
              orderBy: { name: "asc" },
            },
          }
        : { _count: { select: { topics: true, worksheets: true } } },
      orderBy: { name: "asc" },
    });
    res.json(subjects);
  } catch (error) {
    console.error("GetSubjects error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createSubject(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { name, slug } = req.body;
    if (!name || !String(name).trim()) {
      res.status(400).json({ message: "Subject name is required" });
      return;
    }

    const subjectSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const subject = await prisma.subject.create({
      data: { name, slug: subjectSlug },
    });
    res.status(201).json(subject);
  } catch (error) {
    console.error("CreateSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteSubject(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.subject.delete({ where: { id: req.params.id } });
    res.json({ message: "Subject deleted" });
  } catch (error) {
    console.error("DeleteSubject error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Topics
export async function getTopics(req: Request, res: Response): Promise<void> {
  try {
    const { subjectSlug } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { slug: subjectSlug },
    });
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }
    const topics = await prisma.topic.findMany({
      where: { subjectId: subject.id },
      include: { _count: { select: { worksheets: true } } },
      orderBy: { name: "asc" },
    });
    res.json(topics);
  } catch (error) {
    console.error("GetTopics error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createTopic(req: Request, res: Response): Promise<void> {
  try {
    const { name, slug, subjectId } = req.body;
    if (!name || !String(name).trim() || !subjectId) {
      res.status(400).json({ message: "name and subjectId are required" });
      return;
    }

    const topicSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
    const topic = await prisma.topic.create({
      data: { name, slug: topicSlug, subjectId },
    });
    res.status(201).json(topic);
  } catch (error) {
    console.error("CreateTopic error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteTopic(req: Request, res: Response): Promise<void> {
  try {
    await prisma.topic.delete({ where: { id: req.params.id } });
    res.json({ message: "Topic deleted" });
  } catch (error) {
    console.error("DeleteTopic error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Worksheets
export async function getAllWorksheets(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      topicId,
      subjectId,
      difficulty,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));
    const where: Record<string, unknown> = {};
    if (topicId) where.topicId = topicId;
    if (subjectId) where.subjectId = subjectId;
    if (difficulty) where.difficulty = difficulty;

    const [worksheets, total] = await Promise.all([
      prisma.worksheet.findMany({
        where,
        include: {
          topic: { select: { name: true, slug: true } },
          subject: { select: { name: true, slug: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.worksheet.count({ where }),
    ]);

    res.json({ worksheets, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetAllWorksheets error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getWorksheets(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { subjectSlug } = req.params;
    const { topicId, difficulty, page: pageStr, limit: limitStr } = req.query;

    const subject = await prisma.subject.findUnique({
      where: { slug: subjectSlug },
    });
    if (!subject) {
      res.status(404).json({ message: "Subject not found" });
      return;
    }

    const page = Math.max(1, parseInt(pageStr as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(limitStr as string) || 20));
    const where: Record<string, unknown> = { subjectId: subject.id };
    if (topicId) where.topicId = topicId;
    if (difficulty) where.difficulty = difficulty;

    const [worksheets, total] = await Promise.all([
      prisma.worksheet.findMany({
        where,
        include: { topic: { select: { name: true, slug: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.worksheet.count({ where }),
    ]);

    res.json({ worksheets, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("GetWorksheets error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createWorksheet(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { title, subjectId, topicId, difficulty } = req.body;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    const pdfFile = files?.pdf?.[0];
    const answerFile = files?.answer?.[0];

    if (!pdfFile) {
      res.status(400).json({ message: "PDF file is required" });
      return;
    }

    if (!topicId) {
      res.status(400).json({ message: "topicId is required" });
      return;
    }

    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true, subjectId: true },
    });

    if (!topic) {
      res.status(404).json({ message: "Topic not found" });
      return;
    }

    if (subjectId && subjectId !== topic.subjectId) {
      res
        .status(400)
        .json({ message: "Subject does not match the selected topic" });
      return;
    }

    const pdfResult = await uploadFileToCloud(
      pdfFile,
      "eager-minds/worksheets",
    );
    let answerPdfUrl: string | null = null;
    if (answerFile) {
      const answerResult = await uploadFileToCloud(
        answerFile,
        "eager-minds/worksheets",
      );
      answerPdfUrl = answerResult.secure_url;
    }

    const worksheet = await prisma.worksheet.create({
      data: {
        title,
        subjectId: topic.subjectId,
        topicId: topic.id,
        pdfUrl: pdfResult.secure_url,
        answerPdfUrl,
        difficulty: difficulty || "medium",
      },
    });

    res.status(201).json(worksheet);
  } catch (error) {
    console.error("CreateWorksheet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteWorksheet(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.worksheet.delete({ where: { id: req.params.id } });
    res.json({ message: "Worksheet deleted" });
  } catch (error) {
    console.error("DeleteWorksheet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateWorksheet(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    const { title, subjectId, topicId, difficulty } = req.body;
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;

    const pdfFile = files?.pdf?.[0];
    const answerFile = files?.answer?.[0];

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (difficulty !== undefined) data.difficulty = difficulty;

    if (topicId) {
      const topic = await prisma.topic.findUnique({
        where: { id: topicId },
        select: { id: true, subjectId: true },
      });

      if (!topic) {
        res.status(404).json({ message: "Topic not found" });
        return;
      }

      if (subjectId && subjectId !== topic.subjectId) {
        res
          .status(400)
          .json({ message: "Subject does not match the selected topic" });
        return;
      }

      data.topicId = topic.id;
      data.subjectId = topic.subjectId;
    }

    if (pdfFile) {
      const pdfResult = await uploadFileToCloud(
        pdfFile,
        "eager-minds/worksheets",
      );
      data.pdfUrl = pdfResult.secure_url;
    }

    if (answerFile) {
      const answerResult = await uploadFileToCloud(
        answerFile,
        "eager-minds/worksheets",
      );
      data.answerPdfUrl = answerResult.secure_url;
    }

    const worksheet = await prisma.worksheet.update({
      where: { id: req.params.id },
      data,
    });

    res.json(worksheet);
  } catch (error) {
    console.error("UpdateWorksheet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Mark worksheet completed
export async function completeWorksheet(
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
          itemType: "worksheet",
        },
      },
      update: {},
      create: {
        userId: req.user.id,
        itemId: req.params.id,
        itemType: "worksheet",
      },
    });

    res.json(completion);
  } catch (error) {
    console.error("CompleteWorksheet error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Word of the Day
export async function getWordOfTheDay(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const word = await prisma.vocabularyWord.findFirst({
      where: { date: { gte: today, lt: tomorrow } },
    });

    if (!word) {
      // Fall back to the most recent word
      const latest = await prisma.vocabularyWord.findFirst({
        orderBy: { date: "desc" },
      });
      res.json(latest || null);
      return;
    }

    res.json(word);
  } catch (error) {
    console.error("GetWordOfTheDay error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function createWordOfTheDay(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      word,
      meaning,
      synonym,
      antonym,
      exampleSentence,
      pronunciation,
      date,
    } = req.body;

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const vocab = await prisma.vocabularyWord.create({
      data: {
        word,
        meaning,
        synonym,
        antonym,
        exampleSentence,
        pronunciation,
        date: targetDate,
      },
    });
    res.status(201).json(vocab);
  } catch (error) {
    console.error("CreateWordOfTheDay error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function listVocabularyWords(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit as string) || 20),
    );

    const [words, total] = await Promise.all([
      prisma.vocabularyWord.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.vocabularyWord.count(),
    ]);

    res.json({ words, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error("ListVocabularyWords error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function deleteVocabularyWord(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await prisma.vocabularyWord.delete({ where: { id: req.params.id } });
    res.json({ message: "Word deleted" });
  } catch (error) {
    console.error("DeleteVocabularyWord error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateVocabularyWord(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const {
      word,
      meaning,
      synonym,
      antonym,
      exampleSentence,
      pronunciation,
      date,
    } = req.body;

    const data: Record<string, unknown> = {};
    if (word !== undefined) data.word = word;
    if (meaning !== undefined) data.meaning = meaning;
    if (synonym !== undefined) data.synonym = synonym;
    if (antonym !== undefined) data.antonym = antonym;
    if (exampleSentence !== undefined) data.exampleSentence = exampleSentence;
    if (pronunciation !== undefined) data.pronunciation = pronunciation;
    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      data.date = targetDate;
    }

    const updated = await prisma.vocabularyWord.update({
      where: { id: req.params.id },
      data,
    });

    res.json(updated);
  } catch (error) {
    console.error("UpdateVocabularyWord error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

// Dashboard
export async function getUserProgress(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const completions = await prisma.completion.findMany({
      where: { userId: req.user.id },
      orderBy: { completedAt: "desc" },
    });

    // Compute progress per subject
    const worksheetCompletions = completions.filter(
      (c: { itemType: string }) => c.itemType === "worksheet",
    );
    const subjects = await prisma.subject.findMany({
      include: { _count: { select: { worksheets: true } } },
    });

    const worksheetIds = worksheetCompletions.map(
      (c: { itemId: string }) => c.itemId,
    );
    const completedWorksheets =
      worksheetIds.length > 0
        ? await prisma.worksheet.findMany({
            where: { id: { in: worksheetIds } },
            select: { id: true, subjectId: true },
          })
        : [];

    const progress = subjects.map(
      (subject: {
        id: string;
        name: string;
        _count: { worksheets: number };
      }) => {
        const total = subject._count.worksheets;
        const completed = completedWorksheets.filter(
          (w: { subjectId: string }) => w.subjectId === subject.id,
        ).length;
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },
    );

    res.json({ progress });
  } catch (error) {
    console.error("GetUserProgress error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function getUserDashboard(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const [user, completions, saved] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          membershipStatus: true,
        },
      }),
      prisma.completion.findMany({
        where: { userId: req.user.id },
        orderBy: { completedAt: "desc" },
      }),
      prisma.savedResource.findMany({
        where: { userId: req.user.id },
        orderBy: { savedAt: "desc" },
      }),
    ]);

    // Compute progress per subject
    const worksheetCompletions = completions.filter(
      (c: { itemType: string }) => c.itemType === "worksheet",
    );
    const subjects = await prisma.subject.findMany({
      include: { _count: { select: { worksheets: true } } },
    });

    const worksheetIds = worksheetCompletions.map(
      (c: { itemId: string }) => c.itemId,
    );
    const completedWorksheets =
      worksheetIds.length > 0
        ? await prisma.worksheet.findMany({
            where: { id: { in: worksheetIds } },
            select: { id: true, subjectId: true },
          })
        : [];

    const progress = subjects.map(
      (subject: {
        id: string;
        name: string;
        _count: { worksheets: number };
      }) => {
        const total = subject._count.worksheets;
        const completed = completedWorksheets.filter(
          (w: { subjectId: string }) => w.subjectId === subject.id,
        ).length;
        return {
          subjectId: subject.id,
          subjectName: subject.name,
          total,
          completed,
          percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      },
    );

    res.json({ user, completions, saved, progress });
  } catch (error) {
    console.error("GetUserDashboard error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
