CREATE TABLE "ExecutiveEventInbox" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "processingStartedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExecutiveEventInbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutiveEventInbox_status_occurredAt_idx" ON "ExecutiveEventInbox"("status", "occurredAt");
CREATE INDEX "ExecutiveEventInbox_processingStartedAt_idx" ON "ExecutiveEventInbox"("processingStartedAt");
