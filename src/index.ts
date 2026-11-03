import 'dotenv/config';
import { scoreLead } from './qualification/scoring.js';
import { countLeads, saveLead } from './storage/db.js';
import type { Lead } from './types/lead.js';

const demoLead: Lead = {
  companyName: 'Demo China Import Seller',
  website: 'https://example.com',
  source: 'manual_demo',
  marketplacePresence: ['Ozon'],
  chinaSignals: ['imports_from_china', 'recurring_supply', 'needs_consolidation'],
  score: 0,
  status: 'NEW',
};

const result = scoreLead(demoLead);

demoLead.score = result.score;
demoLead.status = result.status;
demoLead.qualificationReason = result.reasons.join('; ');

saveLead(demoLead);

console.log('Line 86 Lead Engine MVP started');
console.log({
  company: demoLead.companyName,
  score: demoLead.score,
  status: demoLead.status,
  reasons: result.reasons,
  totalLeads: countLeads(),
});
