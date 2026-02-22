# Git-Native Agent Memory (GAM)

*Version control for agent state using Git*

---

## Why Git?

Git is already:
- **Distributed** — Works offline, syncs later
- **Auditable** — Full history, blame, diff
- **Signed** — GPG commits for authenticity
- **Mergeable** — Handle conflicts
- **Familiar** — Developers know it

GAM uses Git as the storage layer for agent memory, with FDAA semantics.

---

## How It Works

```
customers/
├── .git/                    # Git repo
├── 12345/
│   ├── customer.md
│   └── memory.md
└── 67890/
    ├── customer.md
    └── memory.md

Each interaction = commit
History = git log
Verification = signed commits
```

---

## Commit Structure

```
commit 7b2e91a3f8c2d1e0
Author: voice-agent-001 <agent@concierge.ai>
Date:   Sat Feb 22 10:30:00 2026 +0000
Signed: GPG key ABC123

    [memory] Customer 12345: Support call about billing

    Interaction: 2026-02-22T10:30:00Z
    Type: support
    Resolution: Explained invoice breakdown
    Mood: satisfied
    Duration: 5min
    
    Conversation-ID: conv_abc123
    FDAA-Hash: e4d1a0...
```

---

## API

### Initialize

```typescript
import { gam } from '@substr8/gam';

// Initialize GAM repo
await gam.init({
  path: '/workspace/customers',
  signingKey: process.env.AGENT_GPG_KEY
});
```

### On Interaction End

```typescript
async function recordInteraction(customerId: string, interaction: Interaction) {
  // Update memory.md
  const memoryPath = `customers/${customerId}/memory.md`;
  const existing = await gam.read(memoryPath);
  const updated = appendInteraction(existing, interaction);
  
  // Commit with metadata
  await gam.commit({
    files: [{ path: memoryPath, content: updated }],
    message: `[memory] Customer ${customerId}: ${interaction.summary}`,
    metadata: {
      interactionId: interaction.id,
      type: interaction.type,
      timestamp: interaction.timestamp,
      fdaaHash: await fdaa.hash(updated)
    },
    sign: true
  });
}
```

### Query History

```typescript
// Get all interactions for a customer
const history = await gam.log({
  path: `customers/${customerId}/memory.md`,
  limit: 50
});

for (const commit of history) {
  console.log(`${commit.date}: ${commit.message}`);
  console.log(`  Signed by: ${commit.signature.keyId}`);
  console.log(`  Verified: ${commit.signature.valid}`);
}
```

### Point-in-Time Read

```typescript
// What did we know about customer on Feb 15?
const state = await gam.at({
  path: `customers/${customerId}/memory.md`,
  ref: '2026-02-15'  // Or specific commit hash
});
```

### Diff Between Versions

```typescript
const diff = await gam.diff({
  path: `customers/${customerId}/customer.md`,
  from: 'abc123',
  to: 'def456'
});
// Returns unified diff
```

---

## Signing Strategy

### Agent Keys

Each agent has a GPG key:

```
Agent: voice-agent-001
Key ID: ABC123DEF456
Fingerprint: 1234 5678 9ABC DEF0...
Expires: 2027-01-01
```

### Verification

```typescript
async function verifyInteraction(customerId: string, commitHash: string) {
  const commit = await gam.getCommit(commitHash);
  
  const verification = {
    valid: commit.signature.valid,
    signer: commit.signature.keyId,
    agent: commit.author,
    timestamp: commit.date,
    content: await gam.getContent(commit, `customers/${customerId}/memory.md`)
  };
  
  return verification;
}
```

---

## Sync Patterns

### Push to Central

```typescript
// After each interaction batch
await gam.push({
  remote: 'origin',
  branch: 'main'
});
```

### Multi-Agent Sync

When multiple agents might write:

```typescript
// Pull latest before writing
await gam.pull({ remote: 'origin' });

// Write changes
await recordInteraction(customerId, interaction);

// Push (may require merge)
try {
  await gam.push({ remote: 'origin' });
} catch (conflict) {
  // Handle merge conflict
  await gam.merge({
    strategy: 'ours',  // Agent's version wins for memory
    message: 'Merge: concurrent interaction'
  });
  await gam.push({ remote: 'origin' });
}
```

---

## FDAA Compatibility

GAM can coexist with FDAA:

```typescript
// Record in both systems
async function recordWithBoth(path: string, content: string) {
  // GAM: Git commit
  await gam.commit({
    files: [{ path, content }],
    message: `Update ${path}`
  });
  
  // FDAA: Hash chain
  const fdaaVersion = await fdaa.snapshot({ path, content });
  
  // Link them
  await gam.tag({
    name: `fdaa-v${fdaaVersion.version}`,
    commit: 'HEAD',
    message: `FDAA: ${fdaaVersion.hash}`
  });
}
```

### Migration Path

```
Start: Files on disk
  ↓
Add GAM: Git versioning
  ↓
Add FDAA: Hash chain overlay
  ↓
Full platform: GAM + FDAA + ACC + DCT
```

---

## Branching Strategies

### Per-Customer Branches (Optional)

```
main
├── customer/12345
├── customer/67890
└── customer/11111
```

Merge to main daily/weekly for backup.

### Feature Branches

Testing new agent behavior:

```
main
└── feature/new-refund-flow
    └── Test with subset of customers
    └── Merge when validated
```

---

## Concierge Patterns

### Atomic Interaction Recording

```typescript
async function completeInteraction(customerId: string, interaction: Interaction) {
  // Start transaction
  await gam.checkout('main');
  await gam.pull();
  
  // Update files atomically
  const customerMd = await updateCustomerProfile(customerId, interaction);
  const memoryMd = await appendMemory(customerId, interaction);
  
  // Single commit for both
  await gam.commit({
    files: [
      { path: `customers/${customerId}/customer.md`, content: customerMd },
      { path: `customers/${customerId}/memory.md`, content: memoryMd }
    ],
    message: `[interaction] ${customerId}: ${interaction.summary}`,
    sign: true
  });
  
  await gam.push();
}
```

### Bulk Operations

```typescript
// Daily maintenance
async function dailySync() {
  // Pull latest
  await gam.pull();
  
  // Batch commit any pending changes
  const pending = await gam.status();
  if (pending.modified.length > 0) {
    await gam.commit({
      all: true,
      message: '[batch] Daily sync'
    });
  }
  
  // Push to remote
  await gam.push();
  
  // Verify chain integrity
  const verification = await gam.verifyAll();
  if (!verification.valid) {
    alert('Chain integrity issue', verification.failures);
  }
}
```

---

## Storage Considerations

### Local

```
/workspace/customers/.git
└── ~100KB per 1000 interactions (compressed)
```

### Remote Options

| Backend | Notes |
|---------|-------|
| GitHub | Easy, familiar |
| GitLab | Self-host option |
| S3 + git-remote-s3 | Cheap storage |
| Gitea | Lightweight self-host |

### Garbage Collection

```typescript
// Periodic cleanup
await gam.gc({
  aggressive: false,
  prune: '30 days'  // Keep recent loose objects
});
```

---

## CLI Tools

```bash
# View customer history
gam log customers/12345/memory.md

# Show specific version
gam show abc123:customers/12345/memory.md

# Verify all signatures
gam verify --all

# Export customer data (GDPR)
gam archive customers/12345 --output customer-12345.zip

# Search across all memory
gam grep "refund" customers/*/memory.md
```

---

## Related

- [substr8-gam package](https://pypi.org/project/substr8-gam/)
- [FDAA Integration](FDAA-INTEGRATION.md)
- [Architecture](ARCHITECTURE.md)
