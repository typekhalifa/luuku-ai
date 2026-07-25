import { knowledgeEngine } from "../knowledge/engine";

async function main() {

    console.log("");

    console.log("===================================");

    console.log("🧠 LUUKU KNOWLEDGE ENGINE TEST");

    console.log("===================================");

    console.log("");

    await knowledgeEngine.ingest();

    console.log("");

    console.log("✅ Test completed.");

}

main().catch((error) => {

    console.error(error);

    process.exit(1);

});