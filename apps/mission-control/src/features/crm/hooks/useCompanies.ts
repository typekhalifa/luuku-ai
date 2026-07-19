import { useEffect, useState } from "react";

import { getCompanies } from "../api/crm.api";

import type { Company } from "../types/company";

export function useCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(console.error);
  }, []);

  return companies;
}