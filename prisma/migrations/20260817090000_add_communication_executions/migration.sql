-- CreateTable
CREATE TABLE "CommunicationExecution" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "taskId" TEXT,
    "idempotencyKey" TEXT,
    "capability" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "recipient" JSONB,
    "audience" TEXT,
    "executionMode" TEXT,
    "policyDecision" TEXT NOT NULL,
    "policyReason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "provider" TEXT,
    "externalId" TEXT,
    "evidence" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationExecution_conversationId_idx" ON "CommunicationExecution"("conversationId");

-- CreateIndex
CREATE INDEX "CommunicationExecution_taskId_idx" ON "CommunicationExecution"("taskId");

-- CreateIndex
CREATE INDEX "CommunicationExecution_status_idx" ON "CommunicationExecution"("status");

-- CreateIndex
CREATE INDEX "CommunicationExecution_createdAt_idx" ON "CommunicationExecution"("createdAt");

-- CreateIndex
CREATE INDEX "CommunicationExecution_provider_idx" ON "CommunicationExecution"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationExecution_idempotencyKey_key" ON "CommunicationExecution"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "CommunicationExecution" ADD CONSTRAINT "CommunicationExecution_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;