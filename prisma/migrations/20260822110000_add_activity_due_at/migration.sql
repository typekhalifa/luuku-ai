ALTER TABLE "Activity" ADD COLUMN "dueAt" TIMESTAMP(3);

UPDATE "Activity"
SET "dueAt" = "createdAt"
WHERE "completed" = false
  AND "dueAt" IS NULL;

CREATE INDEX "Activity_dueAt_idx" ON "Activity"("dueAt");
