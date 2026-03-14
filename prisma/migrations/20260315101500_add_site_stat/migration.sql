-- CreateTable
CREATE TABLE IF NOT EXISTS "SiteStat" (
    "id" TEXT NOT NULL,
    "visitors" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteStat_pkey" PRIMARY KEY ("id")
);
