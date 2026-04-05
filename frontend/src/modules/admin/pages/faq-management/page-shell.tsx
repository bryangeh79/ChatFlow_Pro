import { mockFaqItems } from '../../mock/faq-items';

export function FaqManagementPageShell() {
  return {
    title: 'FAQ Management',
    rows: mockFaqItems,
    actions: ['add', 'edit', 'disable'],
  };
}
