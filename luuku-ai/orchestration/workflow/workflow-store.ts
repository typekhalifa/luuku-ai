import { Workflow } from "./workflow";
import type { ExecutionOwnership } from "../ownership";
import { assertValidExecutionOwnership, ownershipMatches } from "../ownership";

/** Durable persistence boundary for workflow state. */
export interface WorkflowStore {
    create(workflow: Workflow): Promise<Workflow>;
    get(id: string): Promise<Workflow | null>;
    list(): Promise<Workflow[]>;
    save(workflow: Workflow): Promise<Workflow>;
}

export class InMemoryWorkflowStore implements WorkflowStore {
    constructor(private readonly ownership: ExecutionOwnership) {
        assertValidExecutionOwnership(ownership);
    }

    private assertOwnership(workflow: Workflow): void {
        if (!ownershipMatches(this.ownership, workflow.ownership)) {
            throw new Error("WORKFLOW_OWNERSHIP_MISMATCH");
        }
    }

    async create(workflow: Workflow): Promise<Workflow> {
        this.assertOwnership(workflow);
        if (this.workflows.has(workflow.id)) {
            throw new Error(`Workflow ${workflow.id} already exists.`);
        }
        const stored = cloneWorkflow(workflow);
        this.workflows.set(workflow.id, stored);
        return cloneWorkflow(stored);
    }

    async get(id: string): Promise<Workflow | null> {
        const workflow = this.workflows.get(id);
        if (!workflow || !ownershipMatches(this.ownership, workflow.ownership)) return null;
        return cloneWorkflow(workflow);
    }

    async list(): Promise<Workflow[]> {
        return [...this.workflows.values()]
            .filter((workflow) => ownershipMatches(this.ownership, workflow.ownership))
            .map(cloneWorkflow);
    }

    async save(workflow: Workflow): Promise<Workflow> {
        this.assertOwnership(workflow);
        if (!this.workflows.has(workflow.id)) {
            throw new Error(`Workflow ${workflow.id} was not found.`);
        }
        const existing = this.workflows.get(workflow.id)!;
        if (!ownershipMatches(this.ownership, existing.ownership)) {
            throw new Error("WORKFLOW_OWNERSHIP_MISMATCH");
        }
        const stored = cloneWorkflow(workflow);
        this.workflows.set(workflow.id, stored);
        return cloneWorkflow(stored);
    }

    private readonly workflows = new Map<string, Workflow>();
}

function cloneWorkflow(workflow: Workflow): Workflow {
    return {
        ...workflow,
        ownership: { ...workflow.ownership },
        approvedAt: workflow.approvedAt ? new Date(workflow.approvedAt) : undefined,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
        steps: workflow.steps.map((step) => ({
            ...step,
            dependsOn: [...step.dependsOn],
        })),
        metadata: { ...workflow.metadata },
    };
}
