CREATE TABLE "QueueItem" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QueueItem_status_availableAt_idx" ON "QueueItem"("status", "availableAt");
CREATE INDEX "QueueItem_priority_availableAt_idx" ON "QueueItem"("priority", "availableAt");
CREATE INDEX "QueueItem_workflowId_idx" ON "QueueItem"("workflowId");
CREATE INDEX "QueueItem_stepId_idx" ON "QueueItem"("stepId");

ALTER TABLE "QueueItem" ADD CONSTRAINT "QueueItem_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
