# FDAA Integration

*Cryptographic file versioning for customer memory*

---

## Why FDAA?

Customer says: "The agent told me X"
Company says: "No, it said Y"

**With FDAA**: Pull the exact memory state at that timestamp. Hash chain verified.

---

## How It Works

Every customer file change:

```
┌─────────────────────────────────────────────────────────────┐
│  1. AGENT WRITES TO memory.md                               │
│     └── Append: "2026-02-22 — Support call about billing"   │
├─────────────────────────────────────────────────────────────┤
│  2. FDAA HOOK                                               │
│     ├── Calculate: SHA256 of new content                    │
│     ├── Link: previous version hash                         │
│     ├── Record: actor (agent ID), timestamp                 │
│     └── Store: in FDAA registry                             │
├─────────────────────────────────────────────────────────────┤
│  3. RESULT                                                  │
│     └── Immutable version with provenance                   │
└─────────────────────────────────────────────────────────────┘
```

---

## File Version Chain

```
customers/12345/memory.md

┌──────────────────────────────────────────────────────────────┐
│ v1 │ 2026-01-15 │ SHA: a3f8c2... │ Actor: voice-agent-001   │
├──────────────────────────────────────────────────────────────┤
│ v2 │ 2026-02-10 │ SHA: 7b2e91... │ Actor: voice-agent-001   │
│    │            │ Parent: a3f8c2 │                          │
├──────────────────────────────────────────────────────────────┤
│ v3 │ 2026-02-22 │ SHA: e4d1a0... │ Actor: voice-agent-003   │
│    │            │ Parent: 7b2e91 │                          │
└──────────────────────────────────────────────────────────────┘

Chain: a3f8c2 → 7b2e91 → e4d1a0 ✓ verified
```

---

## API Integration

### On Write

```typescript
import { fdaa } from '@substr8/fdaa';

async function updateMemory(customerId: string, content: string) {
  const path = `customers/${customerId}/memory.md`;
  
  // Write file
  await fs.writeFile(path, content);
  
  // Record in FDAA
  await fdaa.snapshot({
    path,
    content,
    actor: 'voice-agent-001',
    metadata: {
      customerId,
      action: 'memory_update',
      conversationId: currentConversation.id
    }
  });
}
```

### On Read (Verification)

```typescript
// Verify a specific version
const verified = await fdaa.verify({
  path: 'customers/12345/memory.md',
  version: 3  // or hash: 'e4d1a0...'
});

if (verified.valid) {
  console.log('Content at this version:', verified.content);
  console.log('Actor:', verified.actor);
  console.log('Timestamp:', verified.timestamp);
}
```

### Historical Query

```typescript
// What did the agent know on 2026-02-15?
const state = await fdaa.at({
  path: 'customers/12345/memory.md',
  timestamp: '2026-02-15T10:00:00Z'
});

// Returns the version that was current at that time
```

---

## Use Cases

### 1. Dispute Resolution

Customer: "Your agent promised free shipping"

```typescript
// Find all interactions around that date
const history = await fdaa.history({
  path: 'customers/12345/memory.md',
  after: '2026-02-01',
  before: '2026-02-10'
});

// Each version has exact content + timestamp
```

### 2. Compliance Audit

Regulator: "Show all customer data modifications in Q1"

```typescript
const audit = await fdaa.audit({
  pathPrefix: 'customers/',
  after: '2026-01-01',
  before: '2026-03-31',
  includeContent: false  // Just metadata
});

// Returns: all changes, who made them, when
```

### 3. GDPR Data Export

Customer: "Give me all my data"

```typescript
const export = await fdaa.export({
  pathPrefix: `customers/${customerId}/`,
  includeHistory: true,
  format: 'zip'
});

// Full history with verification hashes
```

### 4. GDPR Deletion

Customer: "Delete everything about me"

```typescript
await fdaa.delete({
  pathPrefix: `customers/${customerId}/`,
  reason: 'gdpr_request',
  requestedBy: 'customer@email.com'
});

// Files deleted, but audit log retained (for compliance)
```

---

## Implementation

### Phase 1: Basic Integration

```typescript
// Wrap file operations
const concierge = {
  async writeCustomerFile(customerId, filename, content) {
    const path = `customers/${customerId}/${filename}`;
    await fs.writeFile(path, content);
    await fdaa.snapshot({ path, content, actor: this.agentId });
  }
};
```

### Phase 2: Hooks

```yaml
# concierge.config.yaml
fdaa:
  enabled: true
  watch:
    - 'customers/**/customer.md'
    - 'customers/**/memory.md'
  ignore:
    - '*.tmp'
    - '.gitignore'
```

### Phase 3: Real-time

```typescript
// FDAA hooks into write operations directly
fdaa.watch('/workspace/customers', {
  onWrite: (path, content, actor) => {
    // Automatic snapshotting
  }
});
```

---

## Storage Backend Options

| Backend | Pros | Cons |
|---------|------|------|
| SQLite | Simple, local | Single node |
| PostgreSQL | Scalable | Ops overhead |
| IPFS | Decentralized | Latency |
| S3 + DynamoDB | AWS native | Vendor lock |

**Recommendation**: Start SQLite, migrate to Postgres when needed.

---

## Hash Chain Integrity

FDAA uses SHA-256 with parent linking:

```
hash(v3) = SHA256(content + parent_hash + timestamp + actor)
```

To verify the chain:
1. Start at v1, compute hash
2. Use v1 hash as parent for v2, compute v2 hash
3. Continue to head
4. If all match recorded hashes → chain valid

Tamper with any version → chain breaks.

---

## Concierge-Specific Patterns

### Memory Append

Memory.md is append-only during normal operation:

```typescript
async function appendMemory(customerId, interaction) {
  const path = `customers/${customerId}/memory.md`;
  const existing = await fs.readFile(path, 'utf-8');
  const updated = existing + '\n\n' + formatInteraction(interaction);
  
  await fs.writeFile(path, updated);
  await fdaa.snapshot({ 
    path, 
    content: updated, 
    actor: agentId,
    metadata: { action: 'append', interactionId: interaction.id }
  });
}
```

### Profile Update

customer.md can be modified:

```typescript
async function updateProfile(customerId, updates) {
  const path = `customers/${customerId}/customer.md`;
  const existing = parseCustomerMd(await fs.readFile(path, 'utf-8'));
  const updated = { ...existing, ...updates };
  const content = formatCustomerMd(updated);
  
  await fs.writeFile(path, content);
  await fdaa.snapshot({
    path,
    content,
    actor: agentId,
    metadata: { action: 'profile_update', changes: Object.keys(updates) }
  });
}
```

---

## Related

- [FDAA Whitepaper](https://github.com/Substr8-Labs/fdaa)
- [ACC Integration](ACC-INTEGRATION.md)
- [DCT Integration](DCT-INTEGRATION.md)
