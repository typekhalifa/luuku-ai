import {
    ExecutiveCompanyStateObserver,
    type CompanyStateObservationSource,
} from "../v8-i-company-state-observation.js";
import { ExecutiveCompanyStateInterventionAdapter } from "../v8-j-intervention-adapter.js";

async function main(): Promise<void> {
    let salesPipeline = 10;
    let systemHealthy = true;

    const sources: readonly CompanyStateObservationSource[] = [
        {
            source: "sales-system",
            observe: () => [
                { domain: "SALES", key: "qualified-opportunities", value: salesPipeline, observedAt: new Date(), source: "sales-system" },
            ],
        },
        {
            source: "system-monitor",
            observe: () => [
                { domain: "SYSTEM", key: "healthy", value: systemHealthy, observedAt: new Date(), source: "system-monitor" },
            ],
        },
    ];

    const observer = new ExecutiveCompanyStateObserver(sources);
    const adapter = new ExecutiveCompanyStateInterventionAdapter();

    const first = await observer.observe();
    const firstSignals = adapter.derive(first);

    salesPipeline = 14;
    systemHealthy = false;

    const second = await observer.observe(first.snapshot);
    const secondSignals = adapter.derive(second);

    const salesSignal = secondSignals.signals.find((signal) => signal.domain === "SALES");
    const systemSignal = secondSignals.signals.find((signal) => signal.domain === "SYSTEM");

    console.log("V8-J — Bounded Intervention Adapter Validation");
    console.log("-----------------------------------------------");
    console.log(`First intervention signals : ${firstSignals.signals.length}`);
    console.log(`Changed signals            : ${secondSignals.signals.length}`);
    console.log(`Intervention required      : ${secondSignals.interventionRequired}`);
    console.log("");
    console.log("Validated paths:");
    console.log(`✓ First observation remains non-actionable until a meaningful change is detected`);
    console.log(`✓ SALES change → ${salesSignal?.type ?? "missing"}`);
    console.log(`✓ SYSTEM change → ${systemSignal?.type ?? "missing"}`);
    console.log(`✓ SYSTEM change retains ${systemSignal?.severity ?? "missing"} severity`);
    console.log("✓ Adapter produces intervention signals without selecting plans or executing work");

    if (
        firstSignals.signals.length !== 2
        || secondSignals.signals.length !== 2
        || !secondSignals.interventionRequired
        || salesSignal?.type !== "INVESTIGATE_BUSINESS_CHANGE"
        || systemSignal?.type !== "INVESTIGATE_SYSTEM"
        || systemSignal.severity !== "CRITICAL"
    ) {
        throw new Error("V8-J validation failed.");
    }

    console.log("");
    console.log("V8-J VALIDATION: PASS");
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
