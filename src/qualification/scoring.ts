import type { Lead, LeadStatus } from '../types/lead.js';

export function scoreLead(lead: Lead): { score: number; status: LeadStatus; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  if (lead.website) {
    score += 10;
    reasons.push('Есть собственный сайт');
  }

  if (lead.email || lead.phone || lead.telegram || lead.whatsapp) {
    score += 10;
    reasons.push('Есть прямой контакт');
  }

  if (lead.marketplacePresence?.length) {
    score += 20;
    reasons.push('Есть присутствие на маркетплейсах');
  }

  const signals = new Set(lead.chinaSignals ?? []);

  if (signals.has('imports_from_china')) {
    score += 25;
    reasons.push('Есть признаки импорта из Китая');
  }

  if (signals.has('recurring_supply')) {
    score += 15;
    reasons.push('Есть признаки регулярных поставок');
  }

  if (
    signals.has('needs_qc') ||
    signals.has('needs_labeling') ||
    signals.has('needs_consolidation') ||
    signals.has('needs_compliant_logistics')
  ) {
    score += 20;
    reasons.push('Есть потенциальная потребность в сервисах Line 86');
  }

  score = Math.min(score, 100);

  let status: LeadStatus = 'NEW';
  if (score >= 80) status = 'HOT';
  else if (score >= 65) status = 'QUALIFIED';

  return { score, status, reasons };
}
