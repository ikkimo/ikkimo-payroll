export type BasicEmployeeRow = {
  uuid: string;
  internal_no: number;
  employee_code: string;
  preferred_name: string | null;
  employee_name: string;
  department: string | null;
  position: string | null;
  start_date: string | null;
  active: boolean;
  base_salary: number;
  current_salary?: number | null;
  seniority_grades?: {
    grade: number;
    increase_monthly_idr?: number;
  }[];
  skill_grades?: {
    position: string | null;
    level: number | null;
    increase_monthly_idr?: number;
  }[];
};

export type EmployeeSortKey =
  | "internal_no"
  | "employee_code"
  | "employee_name"
  | "start_date"
  | "department"
  | "position";

export const SORT_OPTIONS: Array<{ value: EmployeeSortKey; label: string }> = [
  { value: "internal_no", label: "No." },
  { value: "employee_code", label: "No. ID Karyawan" },
  { value: "employee_name", label: "Name Lengkap" },
  { value: "start_date", label: "Start date" },
  { value: "department", label: "Department" },
  { value: "position", label: "Posisi" },
];