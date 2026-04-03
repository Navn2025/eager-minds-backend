import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";
const FREE_PAPER_XP_THRESHOLDS = [300, 700, 1200, 1800, 2500];
function getNextPaperUnlockXp(totalXp) {
    return (FREE_PAPER_XP_THRESHOLDS.find((threshold) => threshold > totalXp) ?? null);
}
export async function getPapers(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const accessUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                role: true,
                quizXp: true,
                freePaperUnlocks: true,
            },
        });
        if (!accessUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const hasPremiumAccess = accessUser.role === "premium" || accessUser.role === "admin";
        const freePaperUnlocks = accessUser.freePaperUnlocks || 0;
        if (!hasPremiumAccess && freePaperUnlocks <= 0) {
            res.status(403).json({
                message: "This resource is available for premium members, or by earning quiz XP to unlock free papers.",
                entitlement: {
                    hasPremiumAccess: false,
                    freePaperUnlocks,
                    totalXp: accessUser.quizXp,
                    nextUnlockXp: getNextPaperUnlockXp(accessUser.quizXp),
                },
            });
            return;
        }
        const { subjectId, subject, difficulty, page: pageStr, limit: limitStr, } = req.query;
        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(limitStr) || 20));
        const where = {};
        if (subjectId)
            where.subjectId = subjectId;
        if (!subjectId && typeof subject === "string" && subject.trim()) {
            const subjectValue = subject.trim();
            where.subject = {
                is: {
                    OR: [
                        { slug: { equals: subjectValue, mode: "insensitive" } },
                        { name: { equals: subjectValue, mode: "insensitive" } },
                    ],
                },
            };
        }
        if (difficulty)
            where.difficulty = difficulty;
        let papers = [];
        let total = 0;
        if (hasPremiumAccess) {
            const [premiumPapers, premiumTotal] = await Promise.all([
                prisma.paper.findMany({
                    where,
                    include: {
                        subject: { select: { id: true, name: true, slug: true } },
                    },
                    skip: (page - 1) * limit,
                    take: limit,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.paper.count({ where }),
            ]);
            papers = premiumPapers;
            total = premiumTotal;
        }
        else {
            const unlockedPool = await prisma.paper.findMany({
                where,
                include: { subject: { select: { id: true, name: true, slug: true } } },
                orderBy: { createdAt: "desc" },
                take: freePaperUnlocks,
            });
            total = unlockedPool.length;
            const start = (page - 1) * limit;
            papers = unlockedPool.slice(start, start + limit);
        }
        res.json({
            papers,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            entitlement: {
                hasPremiumAccess,
                freePaperUnlocks,
                totalXp: accessUser.quizXp,
                nextUnlockXp: getNextPaperUnlockXp(accessUser.quizXp),
            },
        });
    }
    catch (error) {
        console.error("GetPapers error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getPaper(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Not authenticated" });
            return;
        }
        const accessUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                role: true,
                freePaperUnlocks: true,
            },
        });
        if (!accessUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const hasPremiumAccess = accessUser.role === "premium" || accessUser.role === "admin";
        if (!hasPremiumAccess) {
            const freePaperUnlocks = accessUser.freePaperUnlocks || 0;
            if (freePaperUnlocks <= 0) {
                res.status(403).json({
                    message: "This paper is locked. Earn quiz XP to unlock free papers or upgrade to premium.",
                });
                return;
            }
            const unlockedPaperIds = await prisma.paper.findMany({
                select: { id: true },
                orderBy: { createdAt: "desc" },
                take: freePaperUnlocks,
            });
            const allowedIdSet = new Set(unlockedPaperIds.map((p) => p.id));
            if (!allowedIdSet.has(req.params.id)) {
                res.status(403).json({
                    message: "This paper is outside your current free unlock range. Earn more quiz XP to unlock additional papers.",
                });
                return;
            }
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
    }
    catch (error) {
        console.error("GetPaper error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createPaper(req, res) {
    try {
        const { title, subjectId, difficulty } = req.body;
        const files = req.files;
        const pdfFile = files?.pdf?.[0];
        const answerFile = files?.answer?.[0];
        if (!pdfFile) {
            res.status(400).json({ message: "PDF file is required" });
            return;
        }
        const pdfResult = await uploadFileToCloud(pdfFile, "eager-minds/papers");
        let answerPdfUrl = null;
        if (answerFile) {
            const answerResult = await uploadFileToCloud(answerFile, "eager-minds/papers");
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
    }
    catch (error) {
        console.error("CreatePaper error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updatePaper(req, res) {
    try {
        const { title, subjectId, difficulty } = req.body;
        const files = req.files;
        const pdfFile = files?.pdf?.[0];
        const answerFile = files?.answer?.[0];
        const data = {};
        if (title)
            data.title = title;
        if (subjectId)
            data.subjectId = subjectId;
        if (difficulty)
            data.difficulty = difficulty;
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
    }
    catch (error) {
        console.error("UpdatePaper error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deletePaper(req, res) {
    try {
        await prisma.paper.delete({ where: { id: req.params.id } });
        res.json({ message: "Paper deleted" });
    }
    catch (error) {
        console.error("DeletePaper error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function completePaper(req, res) {
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
    }
    catch (error) {
        console.error("CompletePaper error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Admin: list all papers without premium restriction
export async function adminGetPapers(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
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
    }
    catch (error) {
        console.error("AdminGetPapers error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
