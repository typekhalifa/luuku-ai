CREATE TABLE "ExecutiveLoopCheckpoint" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "handledIntentKeys" JSONB NOT NULL,
    "cycleCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExecutiveLoopCheckpoint_pkey" PRIMARY KEY ("id")
);
