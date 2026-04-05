import { mockLeads } from '../../mock/leads';

export function LeadsPageShell() {
  return {
    title: 'Leads',
    rows: mockLeads,
  };
}
