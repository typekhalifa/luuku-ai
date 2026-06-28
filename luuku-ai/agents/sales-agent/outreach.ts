export function generateColdEmail(memory: any) {

    return `
Subject: Helping ${memory.business} reduce operational friction with AI

Hi,

I recently researched ${memory.business} and noticed opportunities where AI could reduce repetitive operational work and improve internal knowledge access.

Rather than proposing a large digital transformation project, Luuku AI focuses on practical workflow improvements that save time and improve staff productivity.

Based on our assessment, the strongest starting point would be:

${memory.recommendedOffer}

Would you be available for a short 20-minute discovery conversation next week?

Kind regards,

Jean D'Amour Hagabimana
Founder
Luuku AI
`;

}

export function generateLinkedIn(memory: any) {

    return `
Hi,

I recently researched ${memory.business} and came across a few operational areas where AI workflow automation could create measurable value.

I'd love to connect and exchange ideas.

Thanks!

Jean
`;

}

export function generateWhatsApp(memory: any) {

    return `
Hello,

My name is Jean from Luuku AI.

We've been researching organizations in Rwanda and identified a few workflow automation opportunities that may be relevant for ${memory.business}.

Would you be open to a short conversation next week?

Thanks!
`;

}

export function generateCallScript(memory: any) {

    return `
Good morning.

My name is Jean from Luuku AI.

We've recently researched ${memory.business} and identified several opportunities where AI could reduce repetitive internal work.

I'm calling to find out who would be the best person to discuss workflow automation and internal AI tools with.

Could you kindly point me in the right direction?
`;

}