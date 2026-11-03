import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Lead, LeadStatus } from '../types/lead.js';

const dataDir = path.resolve('data');
fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'leads.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    website TEXT,
    country TEXT,
    city TEXT,
    industry TEXT,
    contact_name TEXT,
    contact_role TEXT,
    phone TEXT,
    email TEXT,
    telegram TEXT,
    whatsapp TEXT,
    source TEXT NOT NULL,
    source_url TEXT,
    marketplace_presence TEXT,
    china_signals TEXT,
    qualification_reason TEXT,
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'NEW',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(company_name, website)
  );
`);

function mapRow(row: any): Lead {
  return {
    id: row.id,
    companyName: row.company_name,
    website: row.website ?? undefined,
    country: row.country ?? undefined,
    city: row.city ?? undefined,
    industry: row.industry ?? undefined,
    contactName: row.contact_name ?? undefined,
    contactRole: row.contact_role ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    telegram: row.telegram ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    source: row.source,
    sourceUrl: row.source_url ?? undefined,
    marketplacePresence: JSON.parse(row.marketplace_presence || '[]'),
    chinaSignals: JSON.parse(row.china_signals || '[]'),
    qualificationReason: row.qualification_reason ?? undefined,
    score: row.score,
    status: row.status as LeadStatus,
    createdAt: row.created_at,
  };
}

export function saveLead(lead: Lead): number | null {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO leads (
      company_name, website, country, city, industry,
      contact_name, contact_role, phone, email, telegram, whatsapp,
      source, source_url, marketplace_presence, china_signals,
      qualification_reason, score, status
    ) VALUES (
      @companyName, @website, @country, @city, @industry,
      @contactName, @contactRole, @phone, @email, @telegram, @whatsapp,
      @source, @sourceUrl, @marketplacePresence, @chinaSignals,
      @qualificationReason, @score, @status
    )
  `);

  const result = stmt.run({
    companyName: lead.companyName,
    website: lead.website ?? null,
    country: lead.country ?? null,
    city: lead.city ?? null,
    industry: lead.industry ?? null,
    contactName: lead.contactName ?? null,
    contactRole: lead.contactRole ?? null,
    phone: lead.phone ?? null,
    email: lead.email ?? null,
    telegram: lead.telegram ?? null,
    whatsapp: lead.whatsapp ?? null,
    source: lead.source,
    sourceUrl: lead.sourceUrl ?? null,
    marketplacePresence: JSON.stringify(lead.marketplacePresence ?? []),
    chinaSignals: JSON.stringify(lead.chinaSignals ?? []),
    qualificationReason: lead.qualificationReason ?? null,
    score: lead.score,
    status: lead.status,
  });

  return result.changes ? Number(result.lastInsertRowid) : null;
}

export function listLeads(limit = 100): Lead[] {
  return (db.prepare(`
    SELECT * FROM leads
    ORDER BY score DESC, created_at DESC
    LIMIT ?
  `).all(limit) as any[]).map(mapRow);
}

export function getLead(id: number): Lead | null {
  const row = db.prepare('SELECT * FROM leads WHERE id = ?').get(id) as any;
  return row ? mapRow(row) : null;
}

export function updateLeadStatus(id: number, status: LeadStatus): boolean {
  const result = db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  return result.changes > 0;
}

export function countLeads(): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM leads').get() as { count: number };
  return row.count;
}
