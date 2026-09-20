-- Workflow ownership is intentionally nullable for legacy rows.
-- Unresolved legacy ownership must not be guessed; application stores reject it
-- until ownership is explicitly resolved.
ALTER TABLE "Workflow"
  ADD COLUMN "ownershipScope" TEXT,
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "Workflow"
  ADD CONSTRAINT "Workflow_ownership_invariant"
  CHECK (
    "ownershipScope" IS NULL
    OR (
      "ownershipScope" = 'COMPANY'
      AND "companyId" IS NOT NULL
    )
    OR (
      "ownershipScope" = 'SYSTEM'
      AND "companyId" IS NULL
    )
  );

CREATE INDEX "Workflow_companyId_idx" ON "Workflow"("companyId");
CREATE INDEX "Workflow_ownershipScope_idx" ON "Workflow"("ownershipScope");

ALTER TABLE "Workflow"
  ADD CONSTRAINT "Workflow_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

ALTER TABLE "QueueItem"
  ADD CONSTRAINT "QueueItem_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
