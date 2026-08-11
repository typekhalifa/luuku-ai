CREATE TABLE "CommunicationEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "externalId" TEXT,
    "messageId" TEXT,
    "recipient" TEXT,
    "sender" TEXT,
    "subject" TEXT,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunicationEvent_providerEventId_key" ON "CommunicationEvent"("providerEventId");
CREATE INDEX "CommunicationEvent_externalId_idx" ON "CommunicationEvent"("externalId");
CREATE INDEX "CommunicationEvent_messageId_idx" ON "CommunicationEvent"("messageId");
CREATE INDEX "CommunicationEvent_type_idx" ON "CommunicationEvent"("type");
