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


-- Backfill only ownership that is directly evidenced by existing persisted data.
-- Unresolved rows intentionally remain NULL and are rejected by the application.

UPDATE "CommunicationConversation"
SET "ownershipScope" = 'COMPANY'
WHERE "ownershipScope" IS NULL
  AND "companyId" IS NOT NULL;

UPDATE "CommunicationConversation"
SET
  "ownershipScope" = 'SPACE',
  "spaceId" = COALESCE(
      "spaceId",
      "metadata"->>'spaceId',
      "metadata"->>'communicationSpaceId'
  )
WHERE "ownershipScope" IS NULL
  AND "companyId" IS NULL
  AND (
      "metadata"->>'spaceId' IS NOT NULL
      OR "metadata"->>'communicationSpaceId' IS NOT NULL
  );

UPDATE "CommunicationConversation"
SET "ownershipScope" = 'SYSTEM'
WHERE "ownershipScope" IS NULL
  AND "companyId" IS NULL
  AND "spaceId" IS NULL
  AND "channel" = 'internal';

UPDATE "CommunicationEvent" AS e
SET
  "ownershipScope" = c."ownershipScope",
  "companyId" = c."companyId",
  "spaceId" = c."spaceId"
FROM "CommunicationConversation" AS c
WHERE e."ownershipScope" IS NULL
  AND e."conversationId" = c."id"
  AND c."ownershipScope" IS NOT NULL;

UPDATE "CommunicationEvent"
SET "ownershipScope" = 'COMPANY'
WHERE "ownershipScope" IS NULL
  AND "companyId" IS NOT NULL;

UPDATE "CommunicationExecution" AS e
SET
  "ownershipScope" = c."ownershipScope",
  "companyId" = c."companyId",
  "spaceId" = c."spaceId"
FROM "CommunicationConversation" AS c
WHERE e."ownershipScope" IS NULL
  AND e."conversationId" = c."id"
  AND c."ownershipScope" IS NOT NULL;

UPDATE "CommunicationExecution"
SET "ownershipScope" = 'COMPANY'
WHERE "ownershipScope" IS NULL
  AND "companyId" IS NOT NULL;
