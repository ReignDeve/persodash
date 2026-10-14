-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD');

-- CreateTable
CREATE TABLE "http_actions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'GET',
    "url" TEXT NOT NULL,
    "headers" JSONB NOT NULL DEFAULT '[]',
    "body" TEXT,
    "expectedStatus" INTEGER,
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "http_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_flows" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" TEXT[],
    "stopOnFailure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_runs" (
    "id" TEXT NOT NULL,
    "actionId" TEXT,
    "flowId" TEXT,
    "ok" BOOLEAN NOT NULL,
    "status" INTEGER,
    "durationMs" INTEGER,
    "error" TEXT,
    "preview" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'app',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_runs_actionId_startedAt_idx" ON "action_runs"("actionId", "startedAt");

-- CreateIndex
CREATE INDEX "action_runs_flowId_startedAt_idx" ON "action_runs"("flowId", "startedAt");

-- AddForeignKey
ALTER TABLE "http_actions" ADD CONSTRAINT "http_actions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_runs" ADD CONSTRAINT "action_runs_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "http_actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_runs" ADD CONSTRAINT "action_runs_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "action_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
