import type { Company } from "../types/company";

interface CompanyTableProps {
  companies: Company[];
}

export default function CompanyTable({
  companies,
}: CompanyTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <table className="w-full">
        <thead className="border-b border-neutral-800">
          <tr className="text-left text-sm text-neutral-400">
            <th className="p-4">Company</th>
            <th className="p-4">Industry</th>
            <th className="p-4">Website</th>
            <th className="p-4">Status</th>
          </tr>
        </thead>

        <tbody>
          {companies.map((company) => (
            <tr
              key={company.id}
              className="border-b border-neutral-800 hover:bg-neutral-800/40"
            >
              <td className="p-4">{company.name}</td>
              <td className="p-4">{company.industry}</td>
              <td className="p-4">{company.website}</td>
              <td className="p-4">{company.status}</td>
            </tr>
          ))}

          {companies.length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="p-8 text-center text-neutral-500"
              >
                No companies found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}