import {

    InMemoryMailbox

} from "../mailboxes";

import {

    InMemoryMessageBus

} from "../bus";

import {

    MessagePriority,

    MessageStatus,

    MessageType

} from "../messages";

import {

    MessageEnvelope

} from "../protocols";

const salesMailbox =

    new InMemoryMailbox();

const researchMailbox =

    new InMemoryMailbox();

const bus =

    new InMemoryMessageBus();

bus.register(

    "sales",

    salesMailbox

);

bus.register(

    "research",

    researchMailbox

);

const envelope: MessageEnvelope = {

    sender: {

        id: "sales",

        name: "Sales Agent",

        department: "Sales"

    },

    recipient: {

        id: "research",

        name: "Research Agent",

        department: "Research"

    },

    message: {

        id: crypto.randomUUID(),

        from: "sales",

        to: "research",

        type: MessageType.REQUEST,

        subject:

            "Research Prospect",

        payload: {

            company:

                "Rwanda Revenue Authority"

        },

        priority:

            MessagePriority.HIGH,

        status:

            MessageStatus.PENDING,

        createdAt:

            new Date().toISOString()

    }

};

async function runDemo() {

    console.log("");

    console.log("========================================");

    console.log("     COLLABORATION DEMO");

    console.log("========================================");

    console.log("");

    console.log(

        "Sales -> Research"

    );

    console.log("");

    await bus.send(

        envelope

    );

    const inbox =

        await researchMailbox.read();

    console.log(

        `Research Inbox : ${inbox.length}`

    );

    console.log("");

    console.log(

        inbox[0]

    );

}

runDemo();