export interface ReportSummary {
  totalConversations: number;
  newCustomers: number;
  validLeads: number;
  topQuestions: string[];
  handoffCount: number;
  dailyCount?: number;
  weeklyCount?: number;
}
