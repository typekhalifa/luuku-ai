ALTER TABLE "Workflow"
  DROP CONSTRAINT IF EXISTS "Workflow_ownership_invariant";

ALTER TABLE "Workflow"
  ADD CONSTRAINT "Workflow_ownership_invariant"
  CHECK (
    ("ownershipScope" IS NULL AND "companyId" IS NULL)
    OR (
      "ownershipScope" = 'COMPANY'
      AND "companyId" IS NOT NULL
    )
    OR (
      "ownershipScope" = 'SYSTEM'
      AND "companyId" IS NULL
    )
  );
