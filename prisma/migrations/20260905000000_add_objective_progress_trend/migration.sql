ALTER TABLE "ExecutiveObjective"
ADD COLUMN "previousProgress" INTEGER,
ADD COLUMN "deadlineAt" TIMESTAMP(3),
ADD COLUMN "staleAfterDays" DOUBLE PRECISION;
