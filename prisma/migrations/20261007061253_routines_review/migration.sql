-- CreateEnum
CREATE TYPE "RoutineCadence" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- AlterEnum
ALTER TYPE "NotificationCategory" ADD VALUE 'routine';

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "cadence" "RoutineCadence" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextDue" DATE NOT NULL,
    "remind" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_completions" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "dueDate" DATE NOT NULL,
    "outcome" TEXT NOT NULL DEFAULT 'done',
    "doneAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_snapshots" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "totalEur" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "portfolio_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routines_nextDue_idx" ON "routines"("nextDue");

-- CreateIndex
CREATE INDEX "routine_completions_routineId_doneAt_idx" ON "routine_completions"("routineId", "doneAt");

-- CreateIndex
CREATE INDEX "routine_completions_doneAt_idx" ON "routine_completions"("doneAt");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_snapshots_day_key" ON "portfolio_snapshots"("day");

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_completions" ADD CONSTRAINT "routine_completions_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
