import crypto from "crypto";

import { companyService } from "../../shared/database/services/company.service";

async function main() {

    console.log("");
    console.log("========================================");
    console.log("      DATABASE SMOKE TEST");
    console.log("========================================");
    console.log("");

    const company = await companyService.createCompany({

        id: crypto.randomUUID(),

        name: "Luuku AI Test Company",

        industry: "Artificial Intelligence",

        website: "https://luuku.ai",

        country: "Rwanda",

        city: "Kigali",

        size: "startup",

        status: "prospect",

        confidence: 100,

        verified: true,

        source: "Smoke Test",

        createdAt: new Date().toISOString(),

        updatedAt: new Date().toISOString()

    });

    console.log("✅ Company Created");
    console.log(company);

    console.log("");

    const companies =
        await companyService.getCompanies();

    console.log("========================================");
    console.log("      ALL COMPANIES");
    console.log("========================================");

    console.log(companies);

}

main().catch(console.error);