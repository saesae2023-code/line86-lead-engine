import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import type { Lead } from '../types/lead.js';

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

export function saveLead(lead: Lead): void {
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

  stmt.run({
    ...lead,
    marketplacePresence: JSON.stringify(lead.marketplacePresence ?? []),
    chinaSignals: JSON.stringify(lead.chinaSignals ?? []),
    qualificationReason: lead.qualificationReason ?? null,
  });
}

export function countLeads(): number {
  const row = db.prepare('SELECT COUNT(*) AS count FROM leads').get() as { count: number };
  return row.count;
}
