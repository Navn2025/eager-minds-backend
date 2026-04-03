import prisma from "../lib/prisma.js";
import { uploadFileToCloud } from "../middleware/upload.js";
const fallbackWordBank = [
    {
        word: "Curious",
        meaning: "Eager to know or learn something new.",
        synonym: "Inquisitive",
        antonym: "Indifferent",
        exampleSentence: "The curious student asked thoughtful questions in every lesson.",
        pronunciation: "KYOO-ree-uhs",
    },
    {
        word: "Diligent",
        meaning: "Showing careful and steady effort in your work.",
        synonym: "Hardworking",
        antonym: "Careless",
        exampleSentence: "She was diligent with her revision and improved every week.",
        pronunciation: "DIL-uh-juhnt",
    },
    {
        word: "Resilient",
        meaning: "Able to recover quickly after difficulties.",
        synonym: "Strong",
        antonym: "Fragile",
        exampleSentence: "After a difficult test, he stayed resilient and kept practicing.",
        pronunciation: "ri-ZIL-yuhnt",
    },
    {
        word: "Eloquent",
        meaning: "Fluent and persuasive in speaking or writing.",
        synonym: "Articulate",
        antonym: "Inarticulate",
        exampleSentence: "The speaker gave an eloquent speech.",
        pronunciation: "EL-uh-kwuhnt",
    },
    {
        word: "Meticulous",
        meaning: "Very careful and precise about details.",
        synonym: "Thorough",
        antonym: "Sloppy",
        exampleSentence: "Her meticulous notes helped the whole group revise effectively.",
        pronunciation: "muh-TIK-yuh-luhs",
    },
];
function parseJsonFromAiContent(content) {
    try {
        return JSON.parse(content);
    }
    catch {
        const fenced = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fenced?.[1]) {
            return JSON.parse(fenced[1]);
        }
        const firstBrace = content.indexOf("{");
        const lastBrace = content.lastIndexOf("}");
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return JSON.parse(content.slice(firstBrace, lastBrace + 1));
        }
        throw new Error("No JSON object found");
    }
}
function dayOfYear(input) {
    const date = new Date(input);
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    return Math.floor(diff / 86400000);
}
function normalizeAutoWordPayload(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const data = raw;
    const word = typeof data.word === "string" ? data.word.trim() : "";
    const meaning = typeof data.meaning === "string" ? data.meaning.trim() : "";
    const synonym = typeof data.synonym === "string" ? data.synonym.trim() : "";
    const antonym = typeof data.antonym === "string" ? data.antonym.trim() : "";
    const exampleSentence = typeof data.exampleSentence === "string" ? data.exampleSentence.trim() : "";
    const pronunciation = typeof data.pronunciation === "string" ? data.pronunciation.trim() : "";
    if (!word ||
        !meaning ||
        !synonym ||
        !antonym ||
        !exampleSentence ||
        !pronunciation) {
        return null;
    }
    return {
        word,
        meaning,
        synonym,
        antonym,
        exampleSentence,
        pronunciation,
    };
}
async function autoGenerateWordForDate(date) {
    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    if (!apiKey) {
        return fallbackWordBank[dayOfYear(date) % fallbackWordBank.length];
    }
    const promptDate = date.toISOString().slice(0, 10);
    const prompt = `Generate one vocabulary word for children aged 8-12 for date ${promptDate}. Return JSON only with keys: word, meaning, synonym, antonym, exampleSentence, pronunciation. Keep meaning and example concise and classroom-safe.`;
    try {
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                temperature: 0.6,
                max_tokens: 300,
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: "You are a primary-school vocabulary coach. Return JSON only.",
                    },
                    { role: "user", content: prompt },
                ],
            }),
        });
        if (!groqRes.ok) {
            throw new Error("groq_word_generation_failed");
        }
        const completion = (await groqRes.json());
        const content = completion.choices?.[0]?.message?.content;
        if (!content || typeof content !== "string") {
            throw new Error("groq_word_empty");
        }
        const parsed = parseJsonFromAiContent(content);
        const normalized = normalizeAutoWordPayload(parsed);
        if (!normalized) {
            throw new Error("groq_word_invalid_payload");
        }
        return normalized;
    }
    catch (error) {
        console.error("Auto Word generation fallback:", error);
        return fallbackWordBank[dayOfYear(date) % fallbackWordBank.length];
    }
}
function startOfDay(date) {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
}
function nextDailyRunAt(reference) {
    const nextRun = new Date(reference);
    nextRun.setHours(0, 5, 0, 0);
    if (nextRun.getTime() <= reference.getTime()) {
        nextRun.setDate(nextRun.getDate() + 1);
    }
    return nextRun;
}
export async function ensureWordOfTheDayForDate(date) {
    const targetDate = startOfDay(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const existing = await prisma.vocabularyWord.findFirst({
        where: { date: { gte: targetDate, lt: nextDay } },
        select: { id: true },
    });
    if (existing) {
        return;
    }
    const generated = await autoGenerateWordForDate(targetDate);
    await prisma.vocabularyWord.upsert({
        where: { date: targetDate },
        update: {},
        create: {
            ...generated,
            date: targetDate,
        },
    });
}
export function startAutomaticWordGeneration() {
    const runGeneration = async (reason) => {
        try {
            await ensureWordOfTheDayForDate(new Date());
            console.log(`[WordOfTheDay] ensured for today via ${reason}`);
        }
        catch (error) {
            console.error(`[WordOfTheDay] automatic generation failed (${reason})`, error);
        }
    };
    void runGeneration("startup");
    const scheduleNext = () => {
        const now = new Date();
        const nextRun = nextDailyRunAt(now);
        const delayMs = Math.max(1000, nextRun.getTime() - now.getTime());
        setTimeout(() => {
            void runGeneration("daily-schedule");
            setInterval(() => {
                void runGeneration("daily-interval");
            }, 24 * 60 * 60 * 1000);
        }, delayMs);
    };
    scheduleNext();
}
// Subjects
export async function getSubjects(req, res) {
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
    }
    catch (error) {
        console.error("GetSubjects error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createSubject(req, res) {
    try {
        const { name, slug } = req.body;
        if (!name || !String(name).trim()) {
            res.status(400).json({ message: "Subject name is required" });
            return;
        }
        const subjectSlug = slug ||
            name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        const subject = await prisma.subject.create({
            data: { name, slug: subjectSlug },
        });
        res.status(201).json(subject);
    }
    catch (error) {
        console.error("CreateSubject error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteSubject(req, res) {
    try {
        await prisma.subject.delete({ where: { id: req.params.id } });
        res.json({ message: "Subject deleted" });
    }
    catch (error) {
        console.error("DeleteSubject error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Topics
export async function getTopics(req, res) {
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
    }
    catch (error) {
        console.error("GetTopics error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createTopic(req, res) {
    try {
        const { name, slug, subjectId } = req.body;
        if (!name || !String(name).trim() || !subjectId) {
            res.status(400).json({ message: "name and subjectId are required" });
            return;
        }
        const topicSlug = slug ||
            name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "");
        const topic = await prisma.topic.create({
            data: { name, slug: topicSlug, subjectId },
        });
        res.status(201).json(topic);
    }
    catch (error) {
        console.error("CreateTopic error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteTopic(req, res) {
    try {
        await prisma.topic.delete({ where: { id: req.params.id } });
        res.json({ message: "Topic deleted" });
    }
    catch (error) {
        console.error("DeleteTopic error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Worksheets
export async function getAllWorksheets(req, res) {
    try {
        const { topicId, subjectId, difficulty, page: pageStr, limit: limitStr, } = req.query;
        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(limitStr) || 20));
        const where = {};
        if (topicId)
            where.topicId = topicId;
        if (subjectId)
            where.subjectId = subjectId;
        if (difficulty)
            where.difficulty = difficulty;
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
    }
    catch (error) {
        console.error("GetAllWorksheets error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getWorksheets(req, res) {
    try {
        const { subjectSlug } = req.params;
        const { topicId, difficulty, page: pageStr, limit: limitStr } = req.query;
        const page = Math.max(1, parseInt(pageStr) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(limitStr) || 20));
        const subject = await prisma.subject.findUnique({
            where: { slug: subjectSlug },
        });
        if (!subject) {
            res.status(404).json({ message: "Subject not found" });
            return;
        }
        const where = { subjectId: subject.id };
        if (topicId)
            where.topicId = topicId;
        if (difficulty)
            where.difficulty = difficulty;
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
    }
    catch (error) {
        console.error("GetWorksheets error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createWorksheet(req, res) {
    try {
        const { title, subjectId, topicId, difficulty } = req.body;
        const files = req.files;
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
        const pdfResult = await uploadFileToCloud(pdfFile, "eager-minds/worksheets");
        let answerPdfUrl = null;
        if (answerFile) {
            const answerResult = await uploadFileToCloud(answerFile, "eager-minds/worksheets");
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
    }
    catch (error) {
        console.error("CreateWorksheet error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteWorksheet(req, res) {
    try {
        await prisma.worksheet.delete({ where: { id: req.params.id } });
        res.json({ message: "Worksheet deleted" });
    }
    catch (error) {
        console.error("DeleteWorksheet error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updateWorksheet(req, res) {
    try {
        const { title, subjectId, topicId, difficulty } = req.body;
        const files = req.files;
        const pdfFile = files?.pdf?.[0];
        const answerFile = files?.answer?.[0];
        const data = {};
        if (title !== undefined)
            data.title = title;
        if (difficulty !== undefined)
            data.difficulty = difficulty;
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
            const pdfResult = await uploadFileToCloud(pdfFile, "eager-minds/worksheets");
            data.pdfUrl = pdfResult.secure_url;
        }
        if (answerFile) {
            const answerResult = await uploadFileToCloud(answerFile, "eager-minds/worksheets");
            data.answerPdfUrl = answerResult.secure_url;
        }
        const worksheet = await prisma.worksheet.update({
            where: { id: req.params.id },
            data,
        });
        res.json(worksheet);
    }
    catch (error) {
        console.error("UpdateWorksheet error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Mark worksheet completed
export async function completeWorksheet(req, res) {
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
    }
    catch (error) {
        console.error("CompleteWorksheet error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Word of the Day
export async function getWordOfTheDay(_req, res) {
    try {
        const today = startOfDay(new Date());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        await ensureWordOfTheDayForDate(today);
        const word = await prisma.vocabularyWord.findFirst({
            where: { date: { gte: today, lt: tomorrow } },
        });
        if (!word) {
            res.status(404).json({ message: "Word of the day not found" });
            return;
        }
        res.json(word);
    }
    catch (error) {
        console.error("GetWordOfTheDay error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function listWordArchive(req, res) {
    try {
        const today = startOfDay(new Date());
        const requestedLimit = parseInt(req.query.limit, 10);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(3650, Math.max(1, requestedLimit))
            : 365;
        const words = await prisma.vocabularyWord.findMany({
            where: { date: { lt: today } },
            orderBy: { date: "desc" },
            take: limit,
        });
        res.json(words);
    }
    catch (error) {
        console.error("ListWordArchive error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function createWordOfTheDay(req, res) {
    try {
        const { word, meaning, synonym, antonym, exampleSentence, pronunciation, date, } = req.body;
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
    }
    catch (error) {
        console.error("CreateWordOfTheDay error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function listVocabularyWords(req, res) {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const [words, total] = await Promise.all([
            prisma.vocabularyWord.findMany({
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { date: "desc" },
            }),
            prisma.vocabularyWord.count(),
        ]);
        res.json({ words, total, page, totalPages: Math.ceil(total / limit) });
    }
    catch (error) {
        console.error("ListVocabularyWords error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function deleteVocabularyWord(req, res) {
    try {
        await prisma.vocabularyWord.delete({ where: { id: req.params.id } });
        res.json({ message: "Word deleted" });
    }
    catch (error) {
        console.error("DeleteVocabularyWord error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function updateVocabularyWord(req, res) {
    try {
        const { word, meaning, synonym, antonym, exampleSentence, pronunciation, date, } = req.body;
        const data = {};
        if (word !== undefined)
            data.word = word;
        if (meaning !== undefined)
            data.meaning = meaning;
        if (synonym !== undefined)
            data.synonym = synonym;
        if (antonym !== undefined)
            data.antonym = antonym;
        if (exampleSentence !== undefined)
            data.exampleSentence = exampleSentence;
        if (pronunciation !== undefined)
            data.pronunciation = pronunciation;
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
    }
    catch (error) {
        console.error("UpdateVocabularyWord error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
// Dashboard
export async function getUserProgress(req, res) {
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
        const worksheetCompletions = completions.filter((c) => c.itemType === "worksheet");
        const subjects = await prisma.subject.findMany({
            include: { _count: { select: { worksheets: true } } },
        });
        const worksheetIds = worksheetCompletions.map((c) => c.itemId);
        const completedWorksheets = worksheetIds.length > 0
            ? await prisma.worksheet.findMany({
                where: { id: { in: worksheetIds } },
                select: { id: true, subjectId: true },
            })
            : [];
        const progress = subjects.map((subject) => {
            const total = subject._count.worksheets;
            const completed = completedWorksheets.filter((w) => w.subjectId === subject.id).length;
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                total,
                completed,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
        });
        res.json({ progress });
    }
    catch (error) {
        console.error("GetUserProgress error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getUserDashboard(req, res) {
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
        const worksheetCompletions = completions.filter((c) => c.itemType === "worksheet");
        const subjects = await prisma.subject.findMany({
            include: { _count: { select: { worksheets: true } } },
        });
        const worksheetIds = worksheetCompletions.map((c) => c.itemId);
        const completedWorksheets = worksheetIds.length > 0
            ? await prisma.worksheet.findMany({
                where: { id: { in: worksheetIds } },
                select: { id: true, subjectId: true },
            })
            : [];
        const progress = subjects.map((subject) => {
            const total = subject._count.worksheets;
            const completed = completedWorksheets.filter((w) => w.subjectId === subject.id).length;
            return {
                subjectId: subject.id,
                subjectName: subject.name,
                total,
                completed,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            };
        });
        res.json({ user, completions, saved, progress });
    }
    catch (error) {
        console.error("GetUserDashboard error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
