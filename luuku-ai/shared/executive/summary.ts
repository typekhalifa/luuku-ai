import { buildExecutiveCRM } from "./crm";

export function renderExecutiveSummary(): void {

    const crm = buildExecutiveCRM();

    console.log("");

    console.log("========================================");

    console.log("      EXECUTIVE SUMMARY");

    console.log("========================================");

    console.log("");

    console.log("CRM");

    console.log("");

    console.log(`Companies   : ${crm.companies}`);

    console.log(`Contacts    : ${crm.contacts}`);

    console.log(`Deals       : ${crm.deals}`);

    console.log(`Activities  : ${crm.activities}`);

    console.log(`Timeline    : ${crm.timeline}`);

    console.log("");

    console.log("✓ Executive cycle completed successfully.");

}