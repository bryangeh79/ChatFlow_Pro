export interface TeamMember {
  id: string;
  displayName: string;
  roleCode: 'admin' | 'sales' | 'support';
  isActive: boolean;
}
