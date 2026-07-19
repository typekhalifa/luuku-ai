export interface Company {
  id: string;
  name: string;
  industry: string;
  website: string;
  status: "Lead" | "Prospect" | "Customer";
}