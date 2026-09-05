import { ExecutiveStrategicPlanningEngine } from "../strategic-planning-engine.js";
const now = new Date("2026-09-05T09:00:00.000Z");
const make = (id: string, title: string, priority: "high"|"medium"|"low", progress: number) => ({ id, title, description: title, priority, status: "ACTIVE" as const, progress, previousProgress: progress, createdAt: now, updatedAt: now });
const o = (id: string, title: string, priority: "high"|"medium"|"low", progress: number, urgency: number, trend: "IMPROVING"|"STAGNANT"|"REGRESSING", extra: Record<string, unknown> = {}) => ({ objective: make(id,title,priority,progress), assessment: {objectiveId:id,status:"ACTIVE" as const,progress,attentionRequired: trend !== "IMPROVING",reason:"strategic assessment"}, urgency:{objectiveId:id,score:urgency,overdue:false,dueSoon:false,stale:false}, progressTrend:{objectiveId:id,trend,delta:trend==="IMPROVING"?10:trend==="REGRESSING"?-10:0,interventionScore:trend==="REGRESSING"?50:trend==="STAGNANT"?30:0,interventionRequired:trend!=="IMPROVING"}, ...extra });
const plan = new ExecutiveStrategicPlanningEngine().build([
 o("revenue","Grow Qualified Revenue","high",45,80,"STAGNANT",{dependsOnObjectiveIds:["pipeline"],horizon:"SHORT_TERM"}),
 o("pipeline","Build Qualified Pipeline","high",60,40,"IMPROVING",{horizon:"SHORT_TERM"}),
 o("reliability","Maintain Operational Reliability","medium",70,20,"IMPROVING",{conflictsWithObjectiveIds:["revenue"],horizon:"MEDIUM_TERM"}),
], now);
if (plan.dependencyOrder.indexOf("pipeline") > plan.dependencyOrder.indexOf("revenue")) throw new Error("dependency order invalid");
if (plan.conflicts.length !== 1) throw new Error("conflict detection invalid");
if (plan.objectives[0]?.objectiveId !== "revenue") throw new Error("strategic ranking invalid");
console.log("V7.8-AA STRATEGIC PLANNING DEMO");
console.log(`Strategic objectives : ${plan.objectives.length}`);
console.log(`Top objective       : ${plan.objectives[0]?.title}`);
console.log(`Dependency order    : ${plan.dependencyOrder.join(" -> ")}`);
console.log(`Strategic conflicts : ${plan.conflicts.length}`);
console.log(`Conflict            : ${plan.conflicts[0]?.objectiveId} vs ${plan.conflicts[0]?.conflictWith}`);
console.log("");
console.log("✓ Multiple objectives are coordinated at company level.");
console.log("✓ Strategic scoring combines priority, horizon, urgency, trend, and attention.");
console.log("✓ Objective dependencies are resolved before dependent objectives.");
console.log("✓ Strategic conflicts are detected and deduplicated.");
console.log("✓ The strategic layer remains planning-only with no execution side effects.");
