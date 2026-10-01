-- AlterTable
ALTER TABLE "CommunicationEvent" ADD COLUMN     "conversationId" TEXT;

-- CreateTable
CREATE TABLE "CommunicationConversation" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "threadKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "participants" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunicationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sender" JSONB NOT NULL,
    "externalMessageId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CommunicationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationConversation_threadKey_key" ON "CommunicationConversation"("threadKey");

-- CreateIndex
CREATE INDEX "CommunicationConversation_channel_idx" ON "CommunicationConversation"("channel");

-- CreateIndex
CREATE INDEX "CommunicationConversation_status_idx" ON "CommunicationConversation"("status");

-- CreateIndex
CREATE INDEX "CommunicationMessage_conversationId_idx" ON "CommunicationMessage"("conversationId");

-- CreateIndex
CREATE INDEX "CommunicationMessage_externalMessageId_idx" ON "CommunicationMessage"("externalMessageId");

-- CreateIndex
CREATE INDEX "CommunicationEvent_conversationId_idx" ON "CommunicationEvent"("conversationId");

-- AddForeignKey
ALTER TABLE "CommunicationMessage" ADD CONSTRAINT "CommunicationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationEvent" ADD CONSTRAINT "CommunicationEvent_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "CommunicationConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
