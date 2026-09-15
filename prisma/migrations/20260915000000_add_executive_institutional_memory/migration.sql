CREATE TABLE "ExecutiveInstitutionalMemory" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidenceIds" TEXT[] NOT NULL,
    "objectiveIds" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL,
    "firstObservedAt" TIMESTAMP(3) NOT NULL,
    "lastConfirmedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveInstitutionalMemory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutiveInstitutionalMemory_kind_active_idx"
    ON "ExecutiveInstitutionalMemory"("kind", "active");

CREATE INDEX "ExecutiveInstitutionalMemory_subject_idx"
    ON "ExecutiveInstitutionalMemory"("subject");

CREATE INDEX "ExecutiveInstitutionalMemory_confidence_idx"
    ON "ExecutiveInstitutionalMemory"("confidence");

CREATE INDEX "ExecutiveInstitutionalMemory_lastConfirmedAt_idx"
    ON "ExecutiveInstitutionalMemory"("lastConfirmedAt");
