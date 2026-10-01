CREATE TABLE "ExecutiveObjective" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExecutiveObjective_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ExecutiveObjective_status_priority_idx" ON "ExecutiveObjective"("status", "priority");
