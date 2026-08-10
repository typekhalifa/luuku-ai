import "dotenv/config";

import { researchProspect } from "./web-research";

async function runDemo() {
    const company = process.argv.slice(2).join(" ").trim() || "Rwanda Revenue Authority";

    const result = await researchProspect(company, [
        "Assess whether the organization is a credible prospect for Luuku AI workflow automation.",
        "Identify the most relevant public contact or department for an initial business conversation.",
    ]);

    console.log("");
    console.log("========================================");
    console.log("       REAL PROSPECT RESEARCH");
    console.log("========================================");
    console.log("");
    console.log(`Company    : ${result.company.name}`);
    console.log(`Industry   : ${result.company.industry}`);
    console.log(`Website    : ${result.company.website ?? "Not verified"}`);
    console.log(`Location   : ${result.company.city ?? ""}${result.company.city ? ", " : ""}${result.company.country}`);
    console.log(`Confidence : ${result.company.confidence}`);
    console.log("");
    console.log("Contact:");
    console.log(`Name       : ${result.contact.name}`);
    console.log(`Position   : ${result.contact.position ?? "Not verified"}`);
    console.log(`Department : ${result.contact.department ?? "Not verified"}`);
    console.log(`Email      : ${result.contact.email ?? "Not verified"}`);
    console.log(`Phone      : ${result.contact.phoneNumber ?? "Not verified"}`);
    console.log(`Confidence : ${result.contact.confidence}`);
    console.log("");
    console.log("Summary:");
    console.log(result.summary);
    console.log("");
    console.log("Sources:");

    for (const source of result.sources) {
        console.log(`• ${source.title}`);
        console.log(`  ${source.url}`);
    }

    console.log("");
    console.log("Real prospect research completed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Real prospect research failed:", error);
    process.exitCode = 1;
});
