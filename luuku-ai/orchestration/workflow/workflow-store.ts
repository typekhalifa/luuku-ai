import { Workflow } from "./workflow";

/**
 * Durable persistence boundary for workflow state.
 *
 * The runtime depends on this contract rather than a specific database.
 * The first implementation may remain in-memory while the persistent
 * adapter is introduced without changing orchestration semantics.
 */
export interface WorkflowStore {
    create(workflow: Workflow): Promise<Workflow>;
    get(id: string): Promise<Workflow | null>;
    save(workflow: Workflow): Promise<Workflow>;
}

export class InMemoryWorkflowStore implements WorkflowStore {
    private readonly workflows = new Map<string, Workflow>();

    async create(workflow: Workflow): Promise<Workflow> {
        if (this.workflows.has(workflow.id)) {
            throw new Error(`Workflow ${workflow.id} already exists.`);
        }

        const stored = cloneWorkflow(workflow);
        this.workflows.set(workflow.id, stored);
        return cloneWorkflow(stored);
    }

    async get(id: string): Promise<Workflow | null> {
        const workflow = this.workflows.get(id);
        return workflow ? cloneWorkflow(workflow) : null;
    }

    async save(workflow: Workflow): Promise<Workflow> {
        if (!this.workflows.has(workflow.id)) {
            throw new Error(`Workflow ${workflow.id} was not found.`);
        }

        const stored = cloneWorkflow(workflow);
        this.workflows.set(workflow.id, stored);
        return cloneWorkflow(stored);
    }
}

function cloneWorkflow(workflow: Workflow): Workflow {
    return {
        ...workflow,
        approvedAt: workflow.approvedAt ? new Date(workflow.approvedAt) : undefined,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
        steps: workflow.steps.map((step) => ({
            ...step,
            dependsOn: [...step.dependsOn],
            input: { ...step.input },
            metadata: { ...step.metadata },
        })),
        metadata: { ...workflow.metadata },
    };
}
