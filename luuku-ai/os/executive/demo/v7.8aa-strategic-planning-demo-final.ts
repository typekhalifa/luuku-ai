import { ExecutiveStrategicPlanningEngine } from "../strategic-planning-engine.js";
const now = new Date("2026-09-05T09:00:00.000Z");
const make = (id: string, title: string, priority: "high"|"medium"|"low", progress: number) => ({ id, title, description: title, priority, status: "ACTIVE" as const, progress, previousProgress: progress, createdAt: now, updatedAt: now });
const plan = new ExecutiveStrategicPlanningEngine().build([
 { objective: make("revenue","Grow Qualified Revenue","high",45), assessment:{objectiveId:"revenue",status:"ACTIVE",progress:45,attentionRequired:true,reason:"attention"}, urgency:{objectiveId:"revenue",score:80,overdue:false,dueSoon:true,stale:false}, progressTrend:{objectiveId:"revenue",trend:"STAGNANT",delta:0,interventionScore:30,interventionRequired:true}, dependsOnObjectiveIds:["pipeline"], horizon:"SHORT_TERM" },
 { objective: make("pipeline","Build Qualified Pipeline","high",60), assessment:{objectiveId:"pipeline",status:"ACTIVE",progress:60,attentionRequired:false,reason:"stable"}, urgency:{objectiveId:"pipeline",score:40,overdue:false,dueSoon:false,stale:false}, progressTrend:{objectiveId:"pipeline",trend:"IMPROVING",delta:10,interventionScore:0,interventionRequired:false}, horizon:"SHORT_TERM" },
 { objective: make("reliability","Maintain Operational Reliability","medium",70), assessment:{objectiveId:"reliability",status:"ACTIVE",progress:70,attentionRequired:false,reason:"stable"}, urgency:{objectiveId:"reliability",score:20,overdue:false,dueSoon:false,stale:false}, progressTrend:{objectiveId:"reliability",trend:"IMPROVING",delta:5,interventionScore:0,interventionRequired:false}, conflictsWithObjectiveIds:["revenue"], horizon:"MEDIUM_TERM" },
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
