-- CreateTable
CREATE TABLE "ObservabilityEvent" (
    "id" TEXT NOT NULL,
    "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
    "companyId" TEXT,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "executionId" TEXT,
    "workflowId" TEXT,
    "requestId" TEXT,
    "traceId" TEXT,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "status" TEXT,
    "actorType" TEXT,
    "actorId" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObservabilityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObservabilityEvent_companyId_occurredAt_idx" ON "ObservabilityEvent"("companyId", "occurredAt");
CREATE INDEX "ObservabilityEvent_companyId_eventType_occurredAt_idx" ON "ObservabilityEvent"("companyId", "eventType", "occurredAt");
CREATE INDEX "ObservabilityEvent_executionId_occurredAt_idx" ON "ObservabilityEvent"("executionId", "occurredAt");
CREATE INDEX "ObservabilityEvent_workflowId_occurredAt_idx" ON "ObservabilityEvent"("workflowId", "occurredAt");
CREATE INDEX "ObservabilityEvent_requestId_idx" ON "ObservabilityEvent"("requestId");
CREATE INDEX "ObservabilityEvent_traceId_idx" ON "ObservabilityEvent"("traceId");
CREATE INDEX "ObservabilityEvent_severity_occurredAt_idx" ON "ObservabilityEvent"("severity", "occurredAt");
CREATE INDEX "ObservabilityEvent_ownershipScope_occurredAt_idx" ON "ObservabilityEvent"("ownershipScope", "occurredAt");

ALTER TABLE "ObservabilityEvent" ADD CONSTRAINT "ObservabilityEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
