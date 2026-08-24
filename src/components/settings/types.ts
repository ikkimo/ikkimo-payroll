export type PayrollSettingsRow = {
  id: string;
  standard_working_days: number;
  hours_per_day: number;

  bpjs_employee_jht: number;
  bpjs_employee_jp: number;
  bpjs_employee_kesehatan: number;
  bpjs_company_jht: number;
  bpjs_company_jkm: number;
  bpjs_company_jkk: number;
  bpjs_company_jp: number;
  bpjs_company_kesehatan: number;

  overtime1_multiplier: number;
  overtime2_multiplier: number;
  overtime3_multiplier: number;

  thr: number;

  thr_hindu_date: string | null;
  thr_christian_date: string | null;
  thr_muslim_date: string | null;

  payroll_end_date: number;

  meal_allowance_per_day_idr: number;
  attendance_reward_idr: number;

  lateness_base_deduction_idr: number;
  lateness_base_minutes: number;
  lateness_increment_idr: number;
  lateness_increment_minutes: number;

  created_at?: string;
  updated_at?: string;
};

export type PositionRow = {
  id: string;
  name: string;
  allowance_idr: number;
  created_at?: string;
  updated_at?: string;
};

export type SkillGradeRow = {
  id: string;
  position_id: string;
  level: number;
  increase_monthly_idr: number;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type SeniorityGradeRow = {
  id: string;
  grade: number;
  increase_monthly_idr: number;
  created_at?: string;
  updated_at?: string;
};
