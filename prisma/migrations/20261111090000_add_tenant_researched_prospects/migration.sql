CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "tenantCompanyId" TEXT NOT NULL,
    "researchTaskId" TEXT NOT NULL,
    "workflowId" TEXT,
    "business" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "website" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "size" TEXT,
    "fitScore" DOUBLE PRECISION NOT NULL,
    "recommendedOffer" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'researched',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "researchEvidence" JSONB NOT NULL,
    "qualification" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Prospect"
    ADD CONSTRAINT "Prospect_tenantCompanyId_fkey"
    FOREIGN KEY ("tenantCompanyId") REFERENCES "Company"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Prospect_tenantCompanyId_researchTaskId_key"
    ON "Prospect"("tenantCompanyId", "researchTaskId");
CREATE INDEX "Prospect_tenantCompanyId_status_archived_idx"
    ON "Prospect"("tenantCompanyId", "status", "archived");
CREATE INDEX "Prospect_workflowId_idx" ON "Prospect"("workflowId");
CREATE INDEX "Prospect_tenantCompanyId_business_idx"
    ON "Prospect"("tenantCompanyId", "business");

ALTER TABLE "Contact" ADD COLUMN "prospectId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "prospectId" TEXT;

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_prospectId_fkey"
    FOREIGN KEY ("prospectId") REFERENCES "Prospect"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Contact_prospectId_idx" ON "Contact"("prospectId");
CREATE INDEX "Deal_prospectId_idx" ON "Deal"("prospectId");
