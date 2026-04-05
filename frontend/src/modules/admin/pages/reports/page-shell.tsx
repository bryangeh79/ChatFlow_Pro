import { mockReports } from '../../mock/reports';

export function ReportsPageShell() {
  return {
    title: 'Reports',
    metrics: mockReports,
  };
}
