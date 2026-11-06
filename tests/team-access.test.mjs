import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../app/app.js', import.meta.url), 'utf8');
const cloud = readFileSync(new URL('../app/cloud.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../app/index.html', import.meta.url), 'utf8');

test('UI derives authorization from the active Supabase membership, not localStorage role', () => {
  const block = app.slice(app.indexOf('function getPerms()'), app.indexOf('function podeAcessar(m)'));
  assert.match(block, /KanawaCloud\.context\.membership/);
  assert.doesNotMatch(block, /localStorage\.getItem\('kanawa_user'\)/);
});

test('team management uses cloud invitations and role permission RPCs', () => {
  assert.match(app, /KanawaCloud\.createTeamInvitation/);
  assert.match(app, /KanawaCloud\.updateTeamMemberAccess/);
  assert.match(cloud, /ks_create_team_invitation/);
  assert.match(cloud, /ks_update_team_member_access/);
  assert.match(html, /inviteSignupForm/);
});

test('profile does not expose self-service role escalation or local password storage', () => {
  const block = app.slice(app.indexOf('async function renderPerfil()'), app.indexOf('/* ====== DISPOSITIVOS ====== */'));
  assert.doesNotMatch(block, /perfilRole|match\.senha\s*=|user\.role\s*=\s*\$/);
  assert.match(block, /auth\.updateUser\(\{ password: nova \}\)/);
});
