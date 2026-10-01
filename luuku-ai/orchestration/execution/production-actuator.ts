import type { AgentResult } from "../../shared/agents/interface.js";
import type { WorkflowStep } from "../workflow/workflow-step.js";
import {
    V6ActuationBoundaryEngine,
    type V6ActuationContext,
    type V6ActuationResult,
} from "./v6-actuation-boundary.js";

export interface ProductionActuator {
    readonly id: string;
    readonly capabilities: readonly string[];
    execute(step: WorkflowStep): Promise<AgentResult>;
}

export interface ProductionActuatorRegistry {
    register(actuator: ProductionActuator): void;
    resolve(capability: string): ProductionActuator | undefined;
}

export class InMemoryProductionActuatorRegistry implements ProductionActuatorRegistry {
    private readonly actuators = new Map<string, ProductionActuator>();

    register(actuator: ProductionActuator): void {
        if (!actuator.id.trim()) {
            throw new Error("Production actuator requires an id.");
        }
        if (actuator.capabilities.length === 0) {
            throw new Error(`Production actuator ${actuator.id} requires at least one capability.`);
        }

        for (const capability of actuator.capabilities) {
            if (!capability.trim()) {
                throw new Error(`Production actuator ${actuator.id} contains an empty capability.`);
            }
            if (this.actuators.has(capability)) {
                throw new Error(`Production actuator capability is already registered: ${capability}.`);
            }
        }

        for (const capability of actuator.capabilities) {
            this.actuators.set(capability, actuator);
        }
    }

    resolve(capability: string): ProductionActuator | undefined {
        return this.actuators.get(capability.trim());
    }
}

export interface ProductionActuationResult extends V6ActuationResult {
    readonly actuatorId?: string;
}

export class ProductionActuatorComposition {
    constructor(
        private readonly registry: ProductionActuatorRegistry,
        private readonly v6Boundary: V6ActuationBoundaryEngine = new V6ActuationBoundaryEngine(),
    ) {}

    async dispatch(step: WorkflowStep): Promise<ProductionActuationResult> {
        const actuator = this.registry.resolve(step.capability ?? "");

        if (!actuator) {
            const context: V6ActuationContext = {
                workflowId: step.workflowId ?? "",
                stepId: step.id,
                capability: step.capability,
            };

            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context,
                reason: `No production actuator is registered for capability ${step.capability ?? "<missing>"}.`,
            };
        }

        const result = await this.v6Boundary.dispatch(step, async authorizedStep => {
            const authorizedCapability = authorizedStep.capability?.trim();

            if (authorizedCapability !== step.capability?.trim()) {
                throw new Error("Production actuator capability changed after V6 authorization.");
            }

            return actuator.execute(authorizedStep);
        });

        return {
            ...result,
            actuatorId: result.allowed ? actuator.id : undefined,
        };
    }
}
