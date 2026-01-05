import { Hono } from 'hono';

const webhook = new Hono();

async function verifyGitHubSignature(
  body: string,
  signature: string | undefined,
  secret: string
): Promise<boolean> {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const expectedSignature = `sha256=${Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;

  return signature === expectedSignature;
}

webhook.post('/github', async (c) => {
  const signature = c.req.header('X-Hub-Signature-256');
  const event = c.req.header('X-GitHub-Event');
  const deliveryId = c.req.header('X-GitHub-Delivery');

  const body = await c.req.text();
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-webhook-secret';

  const isValid = await verifyGitHubSignature(body, signature, webhookSecret);
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(body) as {
    ref?: string;
    repository?: { full_name: string; default_branch: string };
    action?: string;
    pull_request?: { number: number; head: { ref: string } };
  };

  switch (event) {
    case 'push': {
      const defaultBranch = payload.repository?.default_branch || 'main';
      const pushedBranch = payload.ref?.replace('refs/heads/', '');

      if (pushedBranch === defaultBranch) {
        console.log(`Triggering deployment for ${payload.repository?.full_name}`);
      }
      break;
    }

    case 'pull_request': {
      if (payload.action === 'opened' || payload.action === 'synchronize') {
        console.log(`Preview deploy for PR #${payload.pull_request?.number}`);
      }
      break;
    }

    case 'ping': {
      console.log(`Webhook ping received for delivery ${deliveryId}`);
      break;
    }
  }

  return c.json({ received: true, event, deliveryId });
});

export { webhook };
