export type IntegrationDecision = "ALLOW" | "APPROVAL" | "DENY" | "RATE_LIMITED" | "INVALID" | "FAILED";
export type ExternalFailureClass = "TRANSIENT" | "PERMANENT" | "AUTH" | "RATE_LIMITED" | "UNKNOWN";

export interface ExternalActionDefinition {
    readonly id: string;
    readonly capability: string;
    readonly requiresFounderApproval: boolean;
    readonly validateInput: (input: unknown) => boolean;
    readonly validateOutput: (output: unknown) => boolean;
}

export interface ExternalActionAdapter {
    execute(input: unknown, credential: string): Promise<unknown>;
}
export interface IntegrationCredentialProvider { getCredential(actionId: string): Promise<string | undefined> | string | undefined; }
export interface IntegrationConcurrencyGate { tryAcquire(actionId: string): boolean; release(actionId: string): void; }
export interface IntegrationAuditRecord { readonly id:string; readonly actionId:string; readonly traceId?:string; readonly decision:IntegrationDecision; readonly reason:string; readonly failureClass?:ExternalFailureClass; readonly timestamp:Date; readonly evidence:Readonly<Record<string,unknown>>; }
export interface IntegrationAuditStore { append(record:IntegrationAuditRecord): Promise<void>|void; list():readonly IntegrationAuditRecord[]; }
export interface IntegrationRequest { readonly actionId:string; readonly capability:string; readonly input:unknown; readonly founderApproved?:boolean; readonly traceId?:string; }
export interface IntegrationResult { readonly decision:IntegrationDecision; readonly output?:unknown; readonly reason:string; readonly failureClass?:ExternalFailureClass; readonly audit:IntegrationAuditRecord; }

export class InMemoryExternalActionRegistry {
    private readonly actions = new Map<string, ExternalActionDefinition>();
    register(action: ExternalActionDefinition): void { if (!action.id.trim()) throw new Error("action.id is required."); if (this.actions.has(action.id)) throw new Error(`Action already registered: ${action.id}`); this.actions.set(action.id, action); }
    get(actionId:string): ExternalActionDefinition|undefined { return this.actions.get(actionId); }
}
export class InMemoryIntegrationAuditStore implements IntegrationAuditStore {
    private readonly records:IntegrationAuditRecord[]=[];
    append(record:IntegrationAuditRecord):void { this.records.push(record); }
    list():readonly IntegrationAuditRecord[] { return [...this.records]; }
}
export class InMemoryIntegrationConcurrencyGate implements IntegrationConcurrencyGate {
    private readonly active=new Set<string>();
    tryAcquire(actionId:string):boolean { if(this.active.has(actionId)) return false; this.active.add(actionId); return true; }
    release(actionId:string):void { this.active.delete(actionId); }
}

export interface ExecutiveIntegrationBoundaryOptions {
    readonly registry:InMemoryExternalActionRegistry;
    readonly credentials:IntegrationCredentialProvider;
    readonly concurrency:IntegrationConcurrencyGate;
    readonly audit:IntegrationAuditStore;
    readonly adapters:Readonly<Record<string,ExternalActionAdapter>>;
    readonly classifyFailure?: (error:unknown)=>ExternalFailureClass;
}

export class ExecutiveIntegrationBoundary {
    constructor(private readonly options:ExecutiveIntegrationBoundaryOptions) {}
    async execute(request:IntegrationRequest):Promise<IntegrationResult> {
        const action=this.options.registry.get(request.actionId);
        if(!action) return this.record(request,"DENY","Unknown external action.");
        if(action.capability!==request.capability) return this.record(request,"DENY","Capability does not match the registered action.");
        if(action.requiresFounderApproval && request.founderApproved!==true) return this.record(request,"APPROVAL","Founder approval is required before external execution.");
        if(!action.validateInput(request.input)) return this.record(request,"INVALID","External action input failed validation.");
        const credential=await this.options.credentials.getCredential(action.id);
        if(!credential) return this.record(request,"DENY","External credential is unavailable.","AUTH");
        if(!this.options.concurrency.tryAcquire(action.id)) return this.record(request,"RATE_LIMITED","External action concurrency limit is active.","RATE_LIMITED");
        try {
            const adapter=this.options.adapters[action.id];
            if(!adapter) return this.record(request,"DENY","No adapter is registered for the external action.");
            let output:unknown;
            try { output=await adapter.execute(request.input,credential); }
            catch(error) { const failureClass=this.options.classifyFailure?.(error)??"UNKNOWN"; return this.record(request,"FAILED","External adapter execution failed.",failureClass); }
            if(!action.validateOutput(output)) return this.record(request,"INVALID","External adapter output failed validation.");
            const result=await this.record(request,"ALLOW","External action completed and output was validated.");
            return {...result,output};
        } finally { this.options.concurrency.release(action.id); }
    }
    private async record(request:IntegrationRequest,decision:IntegrationDecision,reason:string,failureClass?:ExternalFailureClass):Promise<IntegrationResult> {
        const audit:IntegrationAuditRecord={id:`integration-audit-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,actionId:request.actionId,traceId:request.traceId,decision,reason,failureClass,timestamp:new Date(),evidence:{capability:request.capability,founderApproved:request.founderApproved===true}};
        await this.options.audit.append(audit); return {decision,reason,failureClass,audit};
    }
}
