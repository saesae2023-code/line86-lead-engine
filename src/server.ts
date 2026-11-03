import 'dotenv/config';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { validateTelegramInitData } from './telegram/auth.js';
import { listLeads, updateLeadStatus } from './storage/db.js';
import { getTeamMember } from './storage/team.js';
import type { LeadStatus } from './types/lead.js';

const port = Number(process.env.PORT ?? 3000);
const publicDir = path.resolve('public');

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function getUser(req: http.IncomingMessage) {
  const initData = req.headers['x-telegram-init-data'];
  if (typeof initData !== 'string') throw new Error('Missing Telegram init data');
  const user = validateTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN ?? '');
  const member = getTeamMember(user.id);
  if (!member?.active) throw new Error('Access denied');
  return { user, member };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/health') {
      return json(res, 200, { ok: true, service: 'line86-lead-engine' });
    }

    if (url.pathname === '/api/leads' && req.method === 'GET') {
      getUser(req);
      return json(res, 200, { leads: listLeads(100) });
    }

    if (url.pathname.startsWith('/api/leads/') && url.pathname.endsWith('/status') && req.method === 'POST') {
      const { member } = getUser(req);
      if (member.role === 'VIEWER') return json(res, 403, { error: 'Read-only role' });

      const leadId = Number(url.pathname.split('/')[3]);
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}') as { status?: LeadStatus };
      const allowed: LeadStatus[] = ['NEW', 'QUALIFIED', 'HOT', 'REJECTED'];
      if (!body.status || !allowed.includes(body.status)) return json(res, 400, { error: 'Invalid status' });

      const updated = updateLeadStatus(leadId, body.status);
      return json(res, updated ? 200 : 404, { ok: updated });
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(path.join(publicDir, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    json(res, 404, { error: 'Not found' });
  } catch (error) {
    json(res, 401, { error: error instanceof Error ? error.message : 'Unauthorized' });
  }
});

server.listen(port, () => {
  console.log(`Line 86 Lead Desk listening on :${port}`);
});
