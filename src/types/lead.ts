export type LeadStatus = 'NEW' | 'QUALIFIED' | 'HOT' | 'REJECTED';

export interface Lead {
  id?: number;
  companyName: string;
  website?: string;
  country?: string;
  city?: string;
  industry?: string;
  contactName?: string;
  contactRole?: string;
  phone?: string;
  email?: string;
  telegram?: string;
  whatsapp?: string;
  source: string;
  sourceUrl?: string;
  marketplacePresence?: string[];
  chinaSignals?: string[];
  qualificationReason?: string;
  score: number;
  status: LeadStatus;
  createdAt?: string;
}
