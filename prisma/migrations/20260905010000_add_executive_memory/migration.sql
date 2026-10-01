CREATE TABLE "ExecutiveMemory" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT,
    "workflowId" TEXT,
    "eventType" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "lesson" TEXT,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutiveMemory_objectiveId_createdAt_idx" ON "ExecutiveMemory"("objectiveId", "createdAt");
CREATE INDEX "ExecutiveMemory_workflowId_createdAt_idx" ON "ExecutiveMemory"("workflowId", "createdAt");
CREATE INDEX "ExecutiveMemory_eventType_createdAt_idx" ON "ExecutiveMemory"("eventType", "createdAt");
CREATE INDEX "ExecutiveMemory_action_createdAt_idx" ON "ExecutiveMemory"("action", "createdAt");
