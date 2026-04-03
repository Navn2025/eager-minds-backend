-- Align wallet columns that may have been introduced outside migration history
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quizXp" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quizCoins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "quizBadge" TEXT NOT NULL DEFAULT 'Rising Learner';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "freePaperUnlocks" INTEGER NOT NULL DEFAULT 0;

-- Align SiteStat primary row behavior with schema default
ALTER TABLE "SiteStat" ALTER COLUMN "id" SET DEFAULT 'global';

-- Persist generated and attempted quizzes
CREATE TABLE IF NOT EXISTS "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "quizPayload" JSONB NOT NULL,
    "selectedAnswers" JSONB,
    "score" INTEGER,
    "totalQuestions" INTEGER,
    "percentage" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'generated',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attemptedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuizAttempt_userId_quizNumber_key"
    ON "QuizAttempt"("userId", "quizNumber");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'QuizAttempt_userId_fkey'
    ) THEN
        ALTER TABLE "QuizAttempt"
            ADD CONSTRAINT "QuizAttempt_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
    END IF;
END $$;
