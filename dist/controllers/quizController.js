import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";
function parsePossiblyWrappedJson(content) {
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
        const firstBracket = content.indexOf("[");
        const lastBracket = content.lastIndexOf("]");
        if (firstBracket >= 0 && lastBracket > firstBracket) {
            return JSON.parse(content.slice(firstBracket, lastBracket + 1));
        }
        throw new Error("No JSON payload found");
    }
}
function normalizeDifficulty(input) {
    if (input === "easy" || input === "hard")
        return input;
    return "medium";
}
function hasVisualDependency(text) {
    return /\b(image|picture|diagram|figure|chart|graph|shape|matrix|visual|shown|above)\b/i.test(text);
}
function hasVisibleText(text) {
    return /[A-Za-z0-9]/.test(text);
}
function isPlaceholderChoice(option) {
    const compact = option
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/[\)\.(\]:_-]/g, "");
    return /^(OPTION|CHOICE)?[ABCD]$/.test(compact);
}
function hasPlaceholderOptions(options) {
    return options.some((option) => isPlaceholderChoice(option));
}
function extractQuestionsFromParsed(parsed) {
    if (Array.isArray(parsed))
        return parsed;
    if (!parsed || typeof parsed !== "object")
        return [];
    const obj = parsed;
    if (Array.isArray(obj.questions))
        return obj.questions;
    if (obj.quiz && typeof obj.quiz === "object") {
        const quizObj = obj.quiz;
        if (Array.isArray(quizObj.questions))
            return quizObj.questions;
    }
    if (obj.data && typeof obj.data === "object") {
        const dataObj = obj.data;
        if (Array.isArray(dataObj.questions))
            return dataObj.questions;
    }
    if (Array.isArray(obj.items))
        return obj.items;
    return [];
}
function getOptionsFromQuestion(item) {
    if (Array.isArray(item.options)) {
        return item.options.filter((o) => typeof o === "string");
    }
    if (item.options && typeof item.options === "object") {
        return Object.values(item.options)
            .filter((o) => typeof o === "string")
            .slice(0, 4);
    }
    const keys = ["optionA", "optionB", "optionC", "optionD"];
    return keys
        .map((key) => item[key])
        .filter((o) => typeof o === "string");
}
function normalizeAnswerIndex(item, options) {
    if (typeof item.answerIndex === "number") {
        return Math.floor(item.answerIndex);
    }
    const answerLike = item.answer ?? item.correctAnswer ?? item.correctOption ?? item.answerIndex;
    if (typeof answerLike === "number") {
        const numeric = Math.floor(answerLike);
        if (numeric >= 0 && numeric <= 3)
            return numeric;
        if (numeric >= 1 && numeric <= 4)
            return numeric - 1;
    }
    if (typeof answerLike === "string") {
        const trimmed = answerLike.trim();
        const numeric = Number.parseInt(trimmed, 10);
        if (!Number.isNaN(numeric)) {
            if (numeric >= 0 && numeric <= 3)
                return numeric;
            if (numeric >= 1 && numeric <= 4)
                return numeric - 1;
        }
        const letter = trimmed.toUpperCase().replace(/[^A-D]/g, "");
        if (letter.length > 0) {
            const idx = letter.charCodeAt(0) - 65;
            if (idx >= 0 && idx <= 3)
                return idx;
        }
        const byText = options.findIndex((option) => option.toLowerCase() === trimmed.toLowerCase());
        if (byText >= 0)
            return byText;
    }
    return -1;
}
function sanitizeQuestions(rawQuestions, fallbackDifficulty) {
    if (!Array.isArray(rawQuestions))
        return [];
    return rawQuestions
        .map((q) => {
        const item = q;
        const question = typeof item.question === "string" ? item.question.trim() : "";
        const explanationRaw = typeof item.explanation === "string" ? item.explanation.trim() : "";
        const difficulty = normalizeDifficulty(typeof item.difficulty === "string"
            ? item.difficulty.toLowerCase()
            : undefined);
        const rawOptions = getOptionsFromQuestion(item);
        const options = rawOptions
            .map((o) => o.trim())
            .filter(Boolean)
            .slice(0, 4);
        const answerIndex = normalizeAnswerIndex(item, options);
        const explanation = explanationRaw ||
            (answerIndex >= 0 && answerIndex < options.length
                ? `The correct answer is ${options[answerIndex]}.`
                : "Review the logic and compare each option carefully.");
        const valid = question.length > 0 &&
            explanation.length > 0 &&
            hasVisibleText(question) &&
            hasVisibleText(explanation) &&
            options.length === 4 &&
            options.every((option) => hasVisibleText(option)) &&
            !hasPlaceholderOptions(options) &&
            !hasVisualDependency(`${question} ${explanation}`) &&
            new Set(options.map((option) => option.toLowerCase())).size === 4 &&
            answerIndex >= 0 &&
            answerIndex < 4;
        if (!valid)
            return null;
        return {
            question,
            options,
            answerIndex,
            explanation,
            difficulty: difficulty || fallbackDifficulty,
        };
    })
        .filter((q) => q !== null);
}
async function requestGroqQuizContent(apiKey, model, userPrompt, temperature) {
    const groqPayload = {
        model,
        temperature,
        max_tokens: 2500,
        response_format: { type: "json_object" },
        messages: [
            {
                role: "system",
                content: "You are an exam writer for 11+ GL Assessment style multiple-choice questions. Generate text-only questions and return only JSON.",
            },
            {
                role: "user",
                content: userPrompt,
            },
        ],
    };
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(groqPayload),
    });
    if (!groqRes.ok) {
        const errorText = await groqRes.text();
        console.error("Groq error", groqRes.status, errorText);
        throw new Error("provider_error");
    }
    const completion = (await groqRes.json());
    const content = completion.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
        throw new Error("provider_empty");
    }
    return content;
}
function generateQuizNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const randomPart = Math.floor(10000 + Math.random() * 90000);
    return `EMC-QZ-${y}${m}${d}-${h}${min}-${randomPart}`;
}
function getQuizBadge(percentage) {
    if (percentage >= 90)
        return "Quiz Champion";
    if (percentage >= 75)
        return "Gold Scholar";
    if (percentage >= 60)
        return "Silver Solver";
    if (percentage >= 40)
        return "Bronze Builder";
    return "Rising Learner";
}
function calculateQuizRewards(score, totalQuestions) {
    const safeTotal = Math.max(1, totalQuestions);
    const safeScore = Math.max(0, Math.min(score, safeTotal));
    const percentage = Math.round((safeScore / safeTotal) * 100);
    const baseXp = 20;
    const performanceXp = safeScore * 8;
    const bonusXp = percentage >= 90 ? 30 : percentage >= 75 ? 20 : percentage >= 60 ? 10 : 0;
    const xpCoins = baseXp + performanceXp + bonusXp;
    const baseCoins = 5;
    const performanceCoins = safeScore * 2;
    const bonusCoins = percentage >= 90 ? 10 : percentage >= 75 ? 7 : percentage >= 60 ? 5 : 0;
    const coins = baseCoins + performanceCoins + bonusCoins;
    return {
        xpCoins,
        coins,
        badge: getQuizBadge(percentage),
        percentage,
    };
}
const FREE_PAPER_XP_THRESHOLDS = [300, 700, 1200, 1800, 2500];
const XP_BADGE_TIERS = [
    { minXp: 0, badge: "Rising Learner" },
    { minXp: 200, badge: "Bronze Explorer" },
    { minXp: 500, badge: "Silver Scholar" },
    { minXp: 900, badge: "Gold Genius" },
    { minXp: 1400, badge: "Platinum Prodigy" },
    { minXp: 2000, badge: "Legendary Master" },
];
function getXpBadge(totalXp) {
    let badge = XP_BADGE_TIERS[0].badge;
    for (const tier of XP_BADGE_TIERS) {
        if (totalXp >= tier.minXp) {
            badge = tier.badge;
        }
    }
    return badge;
}
function getFreePaperUnlocks(totalXp) {
    return FREE_PAPER_XP_THRESHOLDS.filter((threshold) => totalXp >= threshold)
        .length;
}
function getNextFreePaperXp(totalXp) {
    return (FREE_PAPER_XP_THRESHOLDS.find((threshold) => threshold > totalXp) ?? null);
}
function computeDayStreak(dateStrings) {
    const uniqueDays = Array.from(new Set(dateStrings.map((d) => new Date(d).toDateString())));
    const daySet = new Set(uniqueDays);
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(0, 0, 0, 0);
    while (daySet.has(cursor.toDateString())) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}
function normalizeSelectedAnswers(raw, totalQuestions) {
    if (!Array.isArray(raw))
        return null;
    const normalized = raw
        .slice(0, Math.max(0, totalQuestions))
        .map((v) => typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : -1);
    return normalized.length > 0 ? normalized : null;
}
export async function generateQuiz(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const { title, subject, category, topic, type, difficulty, questionCount: requestedCount, } = req.body ?? {};
        const safeTitle = typeof title === "string" ? title.trim() : "Practice Quiz";
        const safeCategory = typeof category === "string" && category.trim().length > 0
            ? category.trim()
            : typeof subject === "string" && subject.trim().length > 0
                ? subject.trim()
                : "General 11+";
        const safeTopic = typeof topic === "string" && topic.trim().length > 0
            ? topic.trim()
            : "Mixed Practice";
        const safeType = typeof type === "string" && type.trim().length > 0
            ? type.trim()
            : "Practice";
        const safeDifficulty = normalizeDifficulty(typeof difficulty === "string" ? difficulty.toLowerCase() : undefined);
        const safeQuestionCount = typeof requestedCount === "number" ? Math.floor(requestedCount) : 10;
        const fixedQuestionCount = 10;
        const unsupportedVisualTopicPattern = /\b(matrix|matrices|non-?verbal|pattern(?:s)?|shape(?:s)?|figure(?:s)?|diagram(?:s)?|visual(?:s)?)\b/i;
        if (unsupportedVisualTopicPattern.test(safeTopic) ||
            unsupportedVisualTopicPattern.test(safeCategory)) {
            res.status(400).json({
                message: "This topic needs visual/image generation, which is not supported yet. Please choose a text-based topic.",
            });
            return;
        }
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            res
                .status(500)
                .json({ message: "Server is missing GROQ_API_KEY configuration" });
            return;
        }
        const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
        const basePrompt = `Generate exactly ${fixedQuestionCount} multiple-choice questions for an 11+ student.\nQuiz title: ${safeTitle}\nCategory: ${safeCategory}\nTopic: ${safeTopic}\nType: ${safeType}\nDifficulty: ${safeDifficulty}\n\nReturn strict JSON using this shape:\n{\n  \"questions\": [\n    {\n      \"question\": \"...\",\n      \"options\": [\"Option 1\", \"Option 2\", \"Option 3\", \"Option 4\"],\n      \"answerIndex\": 0,\n      \"explanation\": \"...\",\n      \"difficulty\": \"easy|medium|hard\"\n    }\n  ]\n}\n\nRules:\n- Exactly 10 questions.\n- Exactly 4 options per question.\n- answerIndex must be 0..3.\n- Style must reflect 11+ GL Assessment format and tone.\n- Questions should be age-appropriate for 9-11 year olds.\n- Keep explanations short, clear, and educational.\n- Avoid repeated questions and repeated option text in the same question.\n- Text only: do not require images, diagrams, shapes, visual matrices, or picture interpretation.\n- Options must be meaningful answer text, never placeholder options like A, B, C, D only.\n- Return JSON only; no markdown, no commentary.`;
        let questions = [];
        let providerFailed = false;
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                const attemptPrompt = attempt === 1
                    ? basePrompt
                    : `${basePrompt}\n\nYour previous output was invalid. Regenerate from scratch and strictly follow the schema.`;
                const content = await requestGroqQuizContent(apiKey, model, attemptPrompt, attempt === 1 ? 0.4 : 0.2);
                const parsed = parsePossiblyWrappedJson(content);
                const rawQuestions = extractQuestionsFromParsed(parsed);
                questions = sanitizeQuestions(rawQuestions, safeDifficulty).slice(0, fixedQuestionCount);
                if (questions.length === fixedQuestionCount) {
                    break;
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : "generation_error";
                if (message === "provider_error" || message === "provider_empty") {
                    providerFailed = true;
                    break;
                }
            }
        }
        if (providerFailed) {
            res
                .status(502)
                .json({ message: "Quiz generation failed from AI provider" });
            return;
        }
        if (questions.length !== fixedQuestionCount) {
            res.status(502).json({ message: "AI returned an invalid quiz payload" });
            return;
        }
        const quiz = {
            quizNumber: generateQuizNumber(),
            title: safeTitle,
            category: safeCategory,
            topic: safeTopic,
            type: safeType,
            difficulty: safeDifficulty,
            questions,
        };
        const persistedQuizPayload = JSON.parse(JSON.stringify(quiz));
        await prisma.quizAttempt.create({
            data: {
                userId: req.user.id,
                quizNumber: quiz.quizNumber,
                title: quiz.title,
                category: quiz.category,
                topic: quiz.topic,
                type: quiz.type,
                difficulty: quiz.difficulty,
                questionCount: quiz.questions.length,
                quizPayload: persistedQuizPayload,
                status: "generated",
            },
        });
        res.json({
            quiz,
            meta: {
                model,
                questionCount: safeQuestionCount,
                generatedAt: new Date().toISOString(),
            },
        });
    }
    catch (error) {
        console.error("GenerateQuiz error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function completeQuiz(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const { quizNumber, score, totalQuestions, title, topic, category, type, difficulty, selectedAnswers, } = req.body ?? {};
        const safeQuizNumber = typeof quizNumber === "string" ? quizNumber.trim() : "";
        if (!safeQuizNumber) {
            res.status(400).json({ message: "quizNumber is required" });
            return;
        }
        const safeScore = typeof score === "number" && Number.isFinite(score)
            ? Math.floor(score)
            : 0;
        const safeTotal = typeof totalQuestions === "number" && Number.isFinite(totalQuestions)
            ? Math.max(1, Math.floor(totalQuestions))
            : 10;
        const safeSelectedAnswers = normalizeSelectedAnswers(selectedAnswers, safeTotal);
        const safePercentage = Math.round((safeScore / safeTotal) * 100);
        const safeTitle = typeof title === "string" && title.trim() ? title.trim() : "Saved Quiz";
        const safeCategory = typeof category === "string" && category.trim()
            ? category.trim()
            : "General 11+";
        const safeTopic = typeof topic === "string" && topic.trim()
            ? topic.trim()
            : "Mixed Practice";
        const safeType = typeof type === "string" && type.trim() ? type.trim() : "Practice";
        const safeAttemptDifficulty = typeof difficulty === "string" && difficulty.trim()
            ? difficulty.trim().toLowerCase()
            : "medium";
        const safeAttemptPayload = {
            quizNumber: safeQuizNumber,
            title: safeTitle,
            category: safeCategory,
            topic: safeTopic,
            type: safeType,
            difficulty: safeAttemptDifficulty,
            questions: [],
        };
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                quizXp: true,
                quizCoins: true,
                quizBadge: true,
                freePaperUnlocks: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const quizRewards = calculateQuizRewards(safeScore, safeTotal);
        const existingCompletion = await prisma.completion.findUnique({
            where: {
                userId_itemId_itemType: {
                    userId: req.user.id,
                    itemId: safeQuizNumber,
                    itemType: "quiz",
                },
            },
            select: { id: true },
        });
        let completionId = existingCompletion?.id || "";
        let alreadyClaimed = Boolean(existingCompletion);
        let grantedXp = 0;
        let grantedCoins = 0;
        let totalXp = user.quizXp;
        let totalCoins = user.quizCoins;
        let freePaperUnlocks = user.freePaperUnlocks;
        let currentBadge = getXpBadge(totalXp);
        let newlyUnlockedPapers = 0;
        if (!alreadyClaimed) {
            const completion = await prisma.completion.create({
                data: {
                    userId: req.user.id,
                    itemId: safeQuizNumber,
                    itemType: "quiz",
                },
            });
            completionId = completion.id;
            grantedXp = quizRewards.xpCoins;
            grantedCoins = quizRewards.coins;
            totalXp = user.quizXp + grantedXp;
            totalCoins = user.quizCoins + grantedCoins;
            freePaperUnlocks = getFreePaperUnlocks(totalXp);
            currentBadge = getXpBadge(totalXp);
            newlyUnlockedPapers = Math.max(0, freePaperUnlocks - user.freePaperUnlocks);
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    quizXp: totalXp,
                    quizCoins: totalCoins,
                    freePaperUnlocks,
                    quizBadge: currentBadge,
                },
            });
        }
        const recentQuizCompletions = await prisma.completion.findMany({
            where: {
                userId: req.user.id,
                itemType: "quiz",
            },
            orderBy: { completedAt: "desc" },
            take: 120,
            select: { completedAt: true },
        });
        const streakDays = computeDayStreak(recentQuizCompletions.map((c) => c.completedAt.toISOString()));
        const nextUnlockXp = getNextFreePaperXp(totalXp);
        await prisma.quizAttempt.upsert({
            where: {
                userId_quizNumber: {
                    userId: req.user.id,
                    quizNumber: safeQuizNumber,
                },
            },
            update: {
                selectedAnswers: safeSelectedAnswers ?? Prisma.JsonNull,
                score: safeScore,
                totalQuestions: safeTotal,
                percentage: safePercentage,
                status: "attempted",
                attemptedAt: new Date(),
            },
            create: {
                userId: req.user.id,
                quizNumber: safeQuizNumber,
                title: safeTitle,
                category: safeCategory,
                topic: safeTopic,
                type: safeType,
                difficulty: safeAttemptDifficulty,
                questionCount: safeTotal,
                quizPayload: safeAttemptPayload,
                selectedAnswers: safeSelectedAnswers ?? Prisma.JsonNull,
                score: safeScore,
                totalQuestions: safeTotal,
                percentage: safePercentage,
                status: "attempted",
                attemptedAt: new Date(),
            },
        });
        res.json({
            completionId,
            alreadyClaimed,
            rewards: {
                ...quizRewards,
                xpCoins: grantedXp,
                coins: grantedCoins,
                streakDays,
                totalXp,
                totalCoins,
                currentBadge,
                freePaperUnlocks,
                newlyUnlockedPapers,
                nextUnlockXp,
            },
        });
    }
    catch (error) {
        console.error("CompleteQuiz error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getQuizAttempts(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const attempts = await prisma.quizAttempt.findMany({
            where: { userId: req.user.id },
            orderBy: [{ attemptedAt: "desc" }, { generatedAt: "desc" }],
            take: 25,
            select: {
                id: true,
                quizNumber: true,
                title: true,
                category: true,
                topic: true,
                type: true,
                difficulty: true,
                questionCount: true,
                status: true,
                score: true,
                totalQuestions: true,
                percentage: true,
                generatedAt: true,
                attemptedAt: true,
            },
        });
        res.json({ attempts: attempts });
    }
    catch (error) {
        console.error("GetQuizAttempts error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
export async function getQuizSummary(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ message: "Authentication required" });
            return;
        }
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                quizXp: true,
                quizCoins: true,
                freePaperUnlocks: true,
                quizBadge: true,
            },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const recentQuizCompletions = await prisma.completion.findMany({
            where: {
                userId: req.user.id,
                itemType: "quiz",
            },
            orderBy: { completedAt: "desc" },
            take: 120,
            select: { completedAt: true },
        });
        const streakDays = computeDayStreak(recentQuizCompletions.map((c) => c.completedAt.toISOString()));
        res.json({
            totalXp: user.quizXp,
            totalCoins: user.quizCoins,
            currentBadge: getXpBadge(user.quizXp),
            freePaperUnlocks: user.freePaperUnlocks,
            nextUnlockXp: getNextFreePaperXp(user.quizXp),
            streakDays,
        });
    }
    catch (error) {
        console.error("GetQuizSummary error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
