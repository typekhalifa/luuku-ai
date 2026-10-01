# Tenant Data Access Contract

## Purpose

The CRM database boundary is explicitly split between tenant-scoped access and system-scoped access.

Customer-facing application and agent paths must use tenant-scoped methods. Cross-tenant reads and writes are available only through methods whose names explicitly end in `System`.

## Tenant-scoped contract

The following service operations require a `companyId`:

- `CompanyService.getCompanies(companyId)`
- `CompanyService.getCompany(id, companyId)`
- `CompanyService.findCompany(name, companyId)`
- `CompanyService.createCompany(company, companyId)`
- `CompanyService.updateCompany(company, companyId)`
- `CompanyService.deleteCompany(id, companyId)`
- Contact, deal, and activity reads/writes likewise require tenant context.
- Cross-company collection methods require both the target company and requester company, and reject mismatches.

At the repository layer, the same rule is enforced. Tenant-scoped Prisma queries include the company predicate before returning or mutating records.

## System-scoped contract

Global executive/system operations use explicitly named methods such as:

- `getCompaniesSystem()`
- `getContactsSystem()`
- `getDealsSystem()`
- `getActivitiesSystem()`
- `findCompanySystem()`
- `createCompanySystem()`

A system caller is therefore visible in code review and cannot accidentally obtain global access by omitting a tenant argument.

## Fail-closed rule

There is no implicit fallback from a missing tenant to a global query.

If a customer-facing path does not have a company ID, it must stop with a tenant-context error rather than searching the entire CRM.

## Executive exception

Lex Executive/system intelligence may legitimately aggregate across companies. Those paths must call the explicit `System` methods. This is intentional system-level access, not tenant inference.

## Fixture/test exception

Development smoke-test fixtures that intentionally operate across the whole local test database use the explicit `System` methods as well. This keeps test behavior honest about its access scope.

## Review rule for new code

When adding a new CRM repository or service method:

1. Decide whether it is TENANT or SYSTEM.
2. If TENANT, require `companyId` in the method contract and include it in the database predicate/ownership check.
3. If SYSTEM, put `System` in the method name.
4. Do not make tenant scope optional.
5. Do not infer a tenant from an untrusted name, email, thread, or arbitrary metadata.
6. Add or update an isolation test when the new boundary can affect customer data.

This contract complements `docs/TENANT-ISOLATION-MATRIX.md`; it does not by itself claim that every repository in the entire codebase has been audited.
