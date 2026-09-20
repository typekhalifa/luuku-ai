-- Persist explicit communication ownership scope.
-- Existing rows remain unresolved (NULL) until trusted historical evidence can
-- establish COMPANY, SPACE, or SYSTEM ownership. Application code must reject
-- unresolved records rather than silently claiming them.

ALTER TABLE "CommunicationConversation"
  ADD COLUMN "ownershipScope" TEXT,
  ADD COLUMN "spaceId" TEXT;

ALTER TABLE "CommunicationEvent"
  ADD COLUMN "ownershipScope" TEXT,
  ADD COLUMN "spaceId" TEXT;

ALTER TABLE "CommunicationExecution"
  ADD COLUMN "ownershipScope" TEXT,
  ADD COLUMN "spaceId" TEXT;

CREATE INDEX "CommunicationConversation_spaceId_idx"
  ON "CommunicationConversation"("spaceId");
CREATE INDEX "CommunicationConversation_ownershipScope_idx"
  ON "CommunicationConversation"("ownershipScope");

CREATE INDEX "CommunicationEvent_spaceId_idx"
  ON "CommunicationEvent"("spaceId");
CREATE INDEX "CommunicationEvent_ownershipScope_idx"
  ON "CommunicationEvent"("ownershipScope");

CREATE INDEX "CommunicationExecution_spaceId_idx"
  ON "CommunicationExecution"("spaceId");
CREATE INDEX "CommunicationExecution_ownershipScope_idx"
  ON "CommunicationExecution"("ownershipScope");
