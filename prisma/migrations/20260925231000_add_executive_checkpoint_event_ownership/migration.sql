ALTER TABLE "ExecutiveLoopCheckpoint"
  ADD COLUMN "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "ExecutiveEventInbox"
  ADD COLUMN "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "ExecutiveLoopCheckpoint"
  ADD CONSTRAINT "ExecutiveLoopCheckpoint_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutiveEventInbox"
  ADD CONSTRAINT "ExecutiveEventInbox_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutiveLoopCheckpoint"
  ADD CONSTRAINT "ExecutiveLoopCheckpoint_ownership_invariant"
  CHECK (
    ("ownershipScope" = 'COMPANY' AND "companyId" IS NOT NULL)
    OR
    ("ownershipScope" = 'SYSTEM' AND "companyId" IS NULL)
  );

ALTER TABLE "ExecutiveEventInbox"
  ADD CONSTRAINT "ExecutiveEventInbox_ownership_invariant"
  CHECK (
    ("ownershipScope" = 'COMPANY' AND "companyId" IS NOT NULL)
    OR
    ("ownershipScope" = 'SYSTEM' AND "companyId" IS NULL)
  );

UPDATE "ExecutiveLoopCheckpoint"
SET "id" = 'executive-loop:system'
WHERE "id" = 'executive-loop';

CREATE INDEX "ExecutiveLoopCheckpoint_companyId_idx"
  ON "ExecutiveLoopCheckpoint"("companyId");

CREATE INDEX "ExecutiveLoopCheckpoint_ownershipScope_idx"
  ON "ExecutiveLoopCheckpoint"("ownershipScope");

CREATE INDEX "ExecutiveEventInbox_companyId_status_occurredAt_idx"
  ON "ExecutiveEventInbox"("companyId", "status", "occurredAt");

CREATE INDEX "ExecutiveEventInbox_ownershipScope_idx"
  ON "ExecutiveEventInbox"("ownershipScope");
