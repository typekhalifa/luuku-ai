-- Add optional durable tenant ownership to communication records.
-- Existing rows remain NULL and are intentionally excluded from tenant-scoped observability
-- until they can be associated with a company through trusted historical evidence.

ALTER TABLE "CommunicationConversation" ADD COLUMN "companyId" TEXT;
ALTER TABLE "CommunicationEvent" ADD COLUMN "companyId" TEXT;
ALTER TABLE "CommunicationExecution" ADD COLUMN "companyId" TEXT;

CREATE INDEX "CommunicationConversation_companyId_idx" ON "CommunicationConversation"("companyId");
CREATE INDEX "CommunicationEvent_companyId_idx" ON "CommunicationEvent"("companyId");
CREATE INDEX "CommunicationExecution_companyId_idx" ON "CommunicationExecution"("companyId");

ALTER TABLE "CommunicationConversation"
  ADD CONSTRAINT "CommunicationConversation_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationEvent"
  ADD CONSTRAINT "CommunicationEvent_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CommunicationExecution"
  ADD CONSTRAINT "CommunicationExecution_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
