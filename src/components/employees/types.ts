export type BasicEmployeeRow = {
  uuid: string;
  internal_no: number | null;
  employee_code: string;
  preferred_name: string | null;
  employee_name: string;
  department: string | null;
  start_date: string | null;
  active: boolean;
  base_salary: number;
  current_salary?: number | null;

  fingerprint_id?: string | null;
  probation?: boolean;

  position_id: string;
  positions?: {
    id: string;
    name: string;
    allowance_idr?: number | null;
  } | null;

  seniority_grades?: {
    id?: string;
    grade: number;
    increase_monthly_idr?: number | null;
  } | null;

  skill_grades?: {
    id?: string;
    position_id?: string;
    level: number | null;
    increase_monthly_idr?: number | null;
  } | null;
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