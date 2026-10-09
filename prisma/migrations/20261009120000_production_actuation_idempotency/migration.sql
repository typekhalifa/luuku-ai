CREATE TABLE "ProductionActuationIdempotency" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "ownershipScope" TEXT NOT NULL,
    "companyId" TEXT,
    "workflowId" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_FLIGHT',
    "result" JSONB,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductionActuationIdempotency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductionActuationIdempotency_idempotencyKey_key"
    ON "ProductionActuationIdempotency"("idempotencyKey");

CREATE INDEX "ProductionActuationIdempotency_companyId_status_idx"
    ON "ProductionActuationIdempotency"("companyId", "status");

CREATE INDEX "ProductionActuationIdempotency_ownershipScope_status_idx"
    ON "ProductionActuationIdempotency"("ownershipScope", "status");

CREATE INDEX "ProductionActuationIdempotency_workflowId_stepId_idx"
    ON "ProductionActuationIdempotency"("workflowId", "stepId");
