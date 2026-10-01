ALTER TABLE "ExecutiveObjective"
  ADD COLUMN "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "ExecutiveMemory"
  ADD COLUMN "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "ExecutiveInstitutionalMemory"
  ADD COLUMN "ownershipScope" TEXT NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "companyId" TEXT;

ALTER TABLE "ExecutiveObjective"
  ADD CONSTRAINT "ExecutiveObjective_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutiveMemory"
  ADD CONSTRAINT "ExecutiveMemory_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutiveInstitutionalMemory"
  ADD CONSTRAINT "ExecutiveInstitutionalMemory_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ExecutiveObjective"
  ADD CONSTRAINT "ExecutiveObjective_ownership_invariant"
  CHECK (
    ("ownershipScope" = 'COMPANY' AND "companyId" IS NOT NULL)
    OR
    ("ownershipScope" = 'SYSTEM' AND "companyId" IS NULL)
  );

ALTER TABLE "ExecutiveMemory"
  ADD CONSTRAINT "ExecutiveMemory_ownership_invariant"
  CHECK (
    ("ownershipScope" = 'COMPANY' AND "companyId" IS NOT NULL)
    OR
    ("ownershipScope" = 'SYSTEM' AND "companyId" IS NULL)
  );

ALTER TABLE "ExecutiveInstitutionalMemory"
  ADD CONSTRAINT "ExecutiveInstitutionalMemory_ownership_invariant"
  CHECK (
    ("ownershipScope" = 'COMPANY' AND "companyId" IS NOT NULL)
    OR
    ("ownershipScope" = 'SYSTEM' AND "companyId" IS NULL)
  );

CREATE INDEX "ExecutiveObjective_companyId_status_priority_idx"
  ON "ExecutiveObjective"("companyId", "status", "priority");

CREATE INDEX "ExecutiveObjective_ownershipScope_idx"
  ON "ExecutiveObjective"("ownershipScope");

CREATE INDEX "ExecutiveMemory_companyId_createdAt_idx"
  ON "ExecutiveMemory"("companyId", "createdAt");

CREATE INDEX "ExecutiveMemory_ownershipScope_idx"
  ON "ExecutiveMemory"("ownershipScope");

CREATE INDEX "ExecutiveInstitutionalMemory_companyId_active_idx"
  ON "ExecutiveInstitutionalMemory"("companyId", "active");

CREATE INDEX "ExecutiveInstitutionalMemory_ownershipScope_idx"
  ON "ExecutiveInstitutionalMemory"("ownershipScope");
