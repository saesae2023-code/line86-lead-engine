import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type TeamRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface TeamMember {
  telegramId: number;
  username?: string;
  displayName?: string;
  role: TeamRole;
  active: boolean;
}

const dataDir = path.resolve('data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'leads.sqlite'));

db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    telegram_id INTEGER PRIMARY KEY,
    username TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'VIEWER',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

export function upsertTeamMember(member: TeamMember): void {
  db.prepare(`
    INSERT INTO team_members (telegram_id, username, display_name, role, active)
    VALUES (@telegramId, @username, @displayName, @role, @active)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      display_name = excluded.display_name,
      role = excluded.role,
      active = excluded.active
  `).run({
    telegramId: member.telegramId,
    username: member.username ?? null,
    displayName: member.displayName ?? null,
    role: member.role,
    active: member.active ? 1 : 0,
  });
}

export function getTeamMember(telegramId: number): TeamMember | null {
  const row = db.prepare(`
    SELECT telegram_id, username, display_name, role, active
    FROM team_members WHERE telegram_id = ?
  `).get(telegramId) as any;

  if (!row) return null;
  return {
    telegramId: row.telegram_id,
    username: row.username ?? undefined,
    displayName: row.display_name ?? undefined,
    role: row.role as TeamRole,
    active: Boolean(row.active),
  };
}

export function listTeamMembers(): TeamMember[] {
  return (db.prepare(`
    SELECT telegram_id, username, display_name, role, active
    FROM team_members ORDER BY created_at ASC
  `).all() as any[]).map((row) => ({
    telegramId: row.telegram_id,
    username: row.username ?? undefined,
    displayName: row.display_name ?? undefined,
    role: row.role as TeamRole,
    active: Boolean(row.active),
  }));
}
