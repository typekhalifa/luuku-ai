import "dotenv/config";

import {
    communicationRouter
} from "../router";

import {
    registerCommunicationProviders
} from "../providers";

async function main() {
    const recipient = process.argv[2];

    if (!recipient) {
        console.error(
            "Usage: npx tsx luuku-ai/shared/communication/demo/real-email-demo.ts <recipient-email>"
        );
        process.exit(1);
    }

    registerCommunicationProviders();

    const result =
        await communicationRouter.execute({
            capability: "email.send",
            channel: "email",
            recipientExternalId: recipient,
            subject: "Luuku AI — Real Communication Layer Test",
            body:
                "This is a controlled test email sent through Luuku AI's provider-neutral communication layer.",
            metadata: {
                audience: "external",
                executionMode: "test",
                source: "real-email-demo",
            },
        });

    console.log("");
    console.log("========================================");
    console.log("       LUUKU REAL EMAIL TEST");
    console.log("========================================");
    console.log("");
    console.log(result);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
