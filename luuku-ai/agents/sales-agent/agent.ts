import readline from "readline";
import { loadProspectMemory } from "../../shared/services/sales-memory";
import { findDecisionMakers } from "./decision-maker";

import {
    generateColdEmail,
    generateLinkedIn,
    generateWhatsApp,
    generateCallScript
} from "./outreach";

import { updateProspectStatus } from "./pipeline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("\n========================================");
console.log("      LUUKU AI SALES AGENT v0.9.2");
console.log("========================================\n");

rl.question("Business: ", (business) => {

  const memory = loadProspectMemory(business);

  if (!memory) {
    console.log("\n❌ Prospect not found.");
    rl.close();
    return;
  }

  console.log("\n========================================");
  console.log("           SALES BRIEF");
  console.log("========================================\n");

  console.log(`Business: ${memory.business}`);
  console.log(`Sector: ${memory.sector}`);
  console.log(`Region: ${memory.region}`);
  console.log(`Fit Score: ${memory.fitScore}/10`);
  console.log(`Recommended Offer: ${memory.recommendedOffer}`);
  console.log(`Status: ${memory.status}`);
  console.log(`Created: ${memory.createdAt}`);
  console.log(`Updated: ${memory.updatedAt}`);

  console.log("\n========================================");
  console.log("     RECOMMENDED DECISION MAKERS");
  console.log("========================================\n");

  const decisionMakers = findDecisionMakers(memory.sector);

  if (decisionMakers.length === 0) {

    console.log("No decision makers available for this sector.\n");

  } else {

    decisionMakers.forEach((person: any, index: number) => {

      console.log(`${index + 1}. ${person.title}`);
      console.log(`   Priority : ${person.priority}/10`);
      console.log(`   Reason   : ${person.reason}\n`);

    });

      console.log("\n========================================");
      console.log("📧 COLD EMAIL");
      console.log("========================================\n");

      console.log(generateColdEmail(memory));

      console.log("\n========================================");
      console.log("💼 LINKEDIN MESSAGE");
      console.log("========================================\n");

      console.log(generateLinkedIn(memory));

      console.log("\n========================================");
      console.log("💬 WHATSAPP MESSAGE");
      console.log("========================================\n");

      console.log(generateWhatsApp(memory));

      console.log("\n========================================");
      console.log("📞 CALL SCRIPT");
      console.log("========================================\n");

      console.log(generateCallScript(memory));

  }

  console.log("========================================");
  console.log(" NEXT RECOMMENDED ACTION");
  console.log("========================================\n");

  console.log("✓ Generate personalized outreach");
  console.log("✓ Prepare discovery meeting");
  console.log("✓ Identify decision-maker contact");
  console.log("✓ Schedule first follow-up");

  console.log("\n========================================\n");

  console.log("========================================");
  console.log("📧 COLD EMAIL");
  console.log("========================================\n");

  console.log(generateColdEmail(memory));

  console.log("========================================");
  console.log("💼 LINKEDIN MESSAGE");
  console.log("========================================\n");

  console.log(generateLinkedIn(memory));

  console.log("========================================");
  console.log("💬 WHATSAPP MESSAGE");
  console.log("========================================\n");

  console.log(generateWhatsApp(memory));

  console.log("========================================");
  console.log("📞 CALL SCRIPT");
  console.log("========================================\n");

  console.log(generateCallScript(memory));

  rl.question(
    "\nUpdate status (contacted / meeting-booked / proposal-sent / won / lost / skip): ",
    (status) => {

      if (status !== "skip") {

        const updated = updateProspectStatus(
            memory.business,
            status as any
        );

          console.log("\n====== UPDATED MEMORY ======\n");

          console.log(updated);

      }

      rl.close();

    }
  );

});

