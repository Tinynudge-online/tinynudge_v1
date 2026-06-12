// Grants Artifact Registry Admin to the Cloud Functions service agent
// Required for first-time Cloud Functions v2 deployment
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

async function main() {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const line = envContent.split('\n').find(l => l.startsWith('SERVICE_ACCOUNT_KEY='));
  const raw = line.slice('SERVICE_ACCOUNT_KEY='.length).trim();
  const keyJson = JSON.parse('"' + raw + '"');
  const key = JSON.parse(keyJson);

  const projectId = key.project_id;
  const projectNumber = '169555706895';
  const member = `serviceAccount:service-${projectNumber}@gcf-admin-robot.iam.gserviceaccount.com`;
  const role = 'roles/artifactregistry.admin';

  const auth = new GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();

  const resourceUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${projectId}`;

  // Get current IAM policy
  const { data: policy } = await client.request({
    url: `${resourceUrl}:getIamPolicy`,
    method: 'POST',
    data: { options: { requestedPolicyVersion: 1 } },
  });

  // Check if binding already exists
  const existing = policy.bindings?.find(b => b.role === role);
  if (existing) {
    if (existing.members.includes(member)) {
      console.log('Permission already granted.');
      return;
    }
    existing.members.push(member);
  } else {
    policy.bindings = policy.bindings || [];
    policy.bindings.push({ role, members: [member] });
  }

  // Set updated policy
  await client.request({
    url: `${resourceUrl}:setIamPolicy`,
    method: 'POST',
    data: { policy },
  });

  console.log(`✓ Granted ${role} to ${member}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
