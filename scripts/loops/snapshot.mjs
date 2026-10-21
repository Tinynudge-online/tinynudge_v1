// Read-only: saves every Loops workflow, workflow email and transactional email
// (with Guardian check results) to scripts/loops/backups/<timestamp>/ so any
// change made by setup.mjs can be inspected or rolled back by hand.
//
//   node --env-file=.env.local scripts/loops/snapshot.mjs

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loops } from './api.mjs';

export async function snapshot() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(dirname(fileURLToPath(import.meta.url)), 'backups', stamp);
  await mkdir(dir, { recursive: true });

  const result = { takenAt: new Date().toISOString(), workflows: [], transactional: [] };

  for (const summary of await loops.listWorkflows()) {
    const workflow = await loops.getWorkflow(summary.id);
    const emails = [];
    for (const [nodeId, node] of Object.entries(workflow.nodes)) {
      if (node.typeName !== 'SendEmailAction') continue;
      const email = await loops.getEmail(node.emailMessageId);
      const guardian = await loops.guardian(node.emailMessageId).catch(err => ({ error: err.message }));
      emails.push({ nodeId, email, guardian });
    }
    result.workflows.push({ workflow, emails });
  }

  for (const summary of await loops.listTransactional()) {
    const emailId = summary.publishedEmailMessageId ?? summary.draftEmailMessageId;
    const email = emailId ? await loops.getEmail(emailId) : null;
    result.transactional.push({ transactional: summary, email });
  }

  const file = join(dir, 'snapshot.json');
  await writeFile(file, JSON.stringify(result, null, 2));
  return { file, result };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { file, result } = await snapshot();
  for (const { workflow, emails } of result.workflows) {
    console.log(`${workflow.name.trim()} [${workflow.status}]`);
    for (const { email, guardian } of emails) {
      const issues = [...(guardian.errors ?? []), ...(guardian.warnings ?? [])].map(r => r.rule);
      console.log(`  - ${email.subject}${issues.length ? `  ⚠ ${issues.join(', ')}` : ''}`);
    }
  }
  console.log(`Transactional emails: ${result.transactional.length}`);
  console.log(`Saved ${file}`);
}
