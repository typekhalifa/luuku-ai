CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requiresFounderApproval" BOOLEAN NOT NULL DEFAULT false,
    "approvedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowStep" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "capability" TEXT,
    "dependsOn" JSONB NOT NULL,
    "priority" TEXT NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Workflow_status_idx" ON "Workflow"("status");
CREATE INDEX "WorkflowStep_workflowId_idx" ON "WorkflowStep"("workflowId");
CREATE INDEX "WorkflowStep_status_idx" ON "WorkflowStep"("status");
CREATE INDEX "WorkflowStep_agentId_idx" ON "WorkflowStep"("agentId");

ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
