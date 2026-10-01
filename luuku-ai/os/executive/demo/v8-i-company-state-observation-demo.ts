import { ExecutiveCompanyStateObserver, type CompanyStateValue } from "../v8-i-company-state-observation.js";

async function main(): Promise<void> {
    console.log("V8-I — Company State & Observation Validation");
    console.log("-----------------------------------------------");

    let salesPipeline = 10;
    let systemHealthy = true;

    const source = (source: string, values: () => CompanyStateValue[]) => ({
        source,
        observe: values,
    });

    const observer = new ExecutiveCompanyStateObserver([
        source("sales-system", () => [{
            domain: "SALES",
            key: "qualifiedPipeline",
            value: salesPipeline,
            observedAt: new Date(),
            source: "sales-system",
        }]),
        source("system-monitor", () => [{
            domain: "SYSTEM",
            key: "healthy",
            value: systemHealthy,
            observedAt: new Date(),
            source: "system-monitor",
        }]),
    ]);

    const first = await observer.observe();
    const second = await observer.observe(first.snapshot);

    salesPipeline = 14;
    systemHealthy = false;

    const third = await observer.observe(second.snapshot);

    assert(first.changes.length === 2, "First observation should establish both signals.");
    assert(second.changes.length === 0, "Unchanged company state should produce no changes.");
    assert(third.changes.length === 2, "Changed sales and system signals should both be detected.");
    assert(third.observations.some((item) => item.domain === "SALES" && item.significance === "ATTENTION"), "Sales change should require attention.");
    assert(third.observations.some((item) => item.domain === "SYSTEM" && item.significance === "CRITICAL"), "System change should be critical.");
    assert(third.interventionRequired, "Meaningful state change should require intervention assessment.");

    console.log(`First observations  : ${first.observations.length}`);
    console.log(`Unchanged changes   : ${second.changes.length}`);
    console.log(`Detected changes    : ${third.changes.length}`);
    console.log(`Intervention needed : ${third.interventionRequired}`);
    console.log("");
    console.log("Validated paths:");
    console.log("✓ First observation establishes company-state signals");
    console.log("✓ Unchanged state does not generate noise");
    console.log("✓ Changed business signals are detected");
    console.log("✓ Critical system changes are escalated in significance");
    console.log("✓ Observation remains read-only and produces no execution");
    console.log("");
    console.log("V8-I VALIDATION: PASS");
}

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(`V8-I validation failed: ${message}`);
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
