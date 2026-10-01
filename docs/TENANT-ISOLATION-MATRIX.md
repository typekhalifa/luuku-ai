# Tenant Isolation Matrix

## Purpose

This matrix records the current Company A vs Company B isolation boundaries on feat/v8.

The invariant is fail-closed tenant isolation: a Company A execution context must not read, mutate, enqueue, claim, or act on Company B state.

| Boundary | Company A context | Company B context | Expected cross-tenant behavior | Validation |
|---|---|---|---|---|
| Workflow persistence | Scoped by ownership/companyId | Scoped by ownership/companyId | B cannot read/save A workflow | PASS: workflow isolation demo |
| Durable queue | Scoped by ownership/companyId | Scoped by ownership/companyId | B cannot enqueue/claim/modify A queue item | PASS: workflow/queue/runtime isolation demo |
| Runtime continuation | Carries workflow ownership | Carries workflow ownership | Ownership cannot drift into another company | PASS: runtime isolation demo |
| Execution ledger | Ownership normalized and persisted | Ownership normalized and persisted | Idempotency/execution records remain tenant-scoped | PASS: ownership propagation path |
| Executive memory | COMPANY ownership | COMPANY ownership | B cannot read/write A memory | PASS: executive ownership isolation demo |
| Executive objectives | COMPANY ownership | COMPANY ownership | B cannot read/write A objectives | PASS: executive ownership isolation demo |
| Institutional memory | COMPANY ownership | COMPANY ownership | B cannot read/write A institutional memory | PASS: executive ownership isolation demo |
| Executive checkpoint | Company-specific checkpoint identity | Company-specific checkpoint identity | B cannot load/update A checkpoint | PASS: checkpoint/event isolation demo |
| Executive event inbox | Ownership-scoped | Ownership-scoped | B cannot claim/update A event | PASS: checkpoint/event isolation demo |
| Generic event store | Store bound to ownership | Store bound to ownership | B cannot read/append A events | PASS: generic event isolation demo |
| Communication conversation | COMPANY ownership + companyId | COMPANY ownership + companyId | B cannot read/update A conversation | PASS: communication ownership boundary |
| Communication thread key | Ownership included in key | Ownership included in key | Same external thread identifier cannot collapse tenants | PASS: scoped thread key |
| Communication execution | Ownership predicate on idempotency updates | Ownership predicate on idempotency updates | B cannot attach/update A execution record | PASS: ownership-scoped persistence |
| Resend inbound resolver | Resolves exactly one company | Resolves exactly one company | 0, conflicting, or ambiguous candidates fail closed | PASS: hardened resolver path |
| Resend communication event | COMPANY ownership + companyId | COMPANY ownership + companyId | Event is persisted inside resolved tenant | PASS: ownership persisted |
| CRM Contact | companyId | companyId | Inbound resolver only accepts contacts from resolved company | PASS: resolver path |
| CRM Deal | companyId | companyId | Deal lookup is performed only after company resolution | PASS: resolver path |
| Activity | companyId | companyId | Inbound activity is written under resolved company | PASS: resolver path |

## Fail-closed rules

1. Missing inbound tenant ownership is rejected.
2. Multiple candidate companies are rejected.
3. Sender-company and thread-company disagreement is rejected.
4. A thread is never used to infer a company unless the thread event itself carries valid COMPANY ownership.
5. Communication events created by resolved inbound email are explicitly persisted with COMPANY ownership.
6. Existing communication conversations are checked against the requested ownership before reuse.
7. System-owned records are not treated as company-owned records.

## Repository contract status

The CRM Company, Contact, Deal, and Activity repositories now require tenant context for tenant-scoped methods. Global access is exposed only through explicitly named `System` methods.

The corresponding service layer follows the same contract, and executive aggregation uses the explicit system methods.

Remaining work is to audit any other repositories outside this CRM boundary and classify their global/system access before customer-facing multi-tenant production.

This matrix does not claim the entire repository is globally production-ready; it records the boundaries that have been explicitly hardened and the remaining authorization classification work.
