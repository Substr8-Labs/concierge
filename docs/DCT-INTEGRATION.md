# DCT Integration

*Delegation Chain Tracking for agent actions*

---

## Why DCT?

Agent did something. Who authorized it?

DCT (Delegation Chain Tracking) answers:
- **Who** delegated the authority?
- **What** were the constraints?
- **When** did delegation happen?
- **Why** was this action taken?

---

## The Chain

```
┌─────────────────────────────────────────────────────────────┐
│  COMPANY POLICY                                             │
│  └── "Support agents can issue refunds up to $100"          │
├─────────────────────────────────────────────────────────────┤
│  DELEGATION 1: Company → Role                               │
│  ├── Delegator: company_policy                              │
│  ├── Delegatee: role:support_agent                          │
│  └── Capability: refund(max: $100)                          │
├─────────────────────────────────────────────────────────────┤
│  DELEGATION 2: Role → Agent                                 │
│  ├── Delegator: role:support_agent                          │
│  ├── Delegatee: voice-agent-001                             │
│  └── Capability: refund(max: $100, requires_reason: true)   │
├─────────────────────────────────────────────────────────────┤
│  ACTION                                                     │
│  ├── Agent: voice-agent-001                                 │
│  ├── Action: refund($45)                                    │
│  ├── Reason: "Product arrived damaged"                      │
│  └── Chain: company → role → agent ✓                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Delegation Record

```json
{
  "id": "del_abc123",
  "delegator": {
    "type": "policy",
    "id": "refund_policy_v2",
    "name": "Support Refund Policy"
  },
  "delegatee": {
    "type": "agent",
    "id": "voice-agent-001"
  },
  "capability": "use:tool:initiate_refund",
  "constraints": {
    "maxAmount": 100,
    "requiresReason": true,
    "requiresCustomerConfirmation": true
  },
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2026-12-31T23:59:59Z",
  "context": {
    "policyVersion": "2.0",
    "approvedBy": "ops-manager-bob"
  }
}
```

---

## Action Tracking

When agent acts, record the full chain:

```json
{
  "id": "act_xyz789",
  "timestamp": "2026-02-22T10:30:00Z",
  "agent": "voice-agent-001",
  "action": {
    "type": "tool_call",
    "tool": "initiate_refund",
    "params": {
      "orderId": "ORD-98765",
      "amount": 45.00,
      "reason": "Product arrived damaged"
    }
  },
  "delegationChain": [
    "del_policy_refund",     // Company policy
    "del_role_support",       // Role assignment
    "del_agent_001_session"   // Session delegation
  ],
  "constraints": {
    "checked": true,
    "passed": true,
    "details": {
      "maxAmount": { "limit": 100, "actual": 45, "passed": true },
      "requiresReason": { "provided": true, "passed": true }
    }
  },
  "conversation": {
    "id": "conv_abc123",
    "customerId": "12345",
    "turnIndex": 5
  }
}
```

---

## API Usage

### Recording Delegation

```typescript
import { dct } from '@substr8/dct';

// Company delegates to role
await dct.delegate({
  delegator: { type: 'policy', id: 'refund_policy_v2' },
  delegatee: { type: 'role', id: 'support_agent' },
  capability: 'use:tool:initiate_refund',
  constraints: { maxAmount: 100 }
});

// Role delegates to specific agent
await dct.delegate({
  delegator: { type: 'role', id: 'support_agent' },
  delegatee: { type: 'agent', id: 'voice-agent-001' },
  capability: 'use:tool:initiate_refund',
  constraints: { maxAmount: 100, requiresReason: true }
});
```

### Recording Action

```typescript
async function executeRefund(orderId: string, amount: number, reason: string) {
  // Get the delegation chain for this action
  const chain = await dct.resolveChain({
    agent: currentAgent.id,
    capability: 'use:tool:initiate_refund'
  });
  
  if (!chain.valid) {
    throw new Error('No valid delegation chain for this action');
  }
  
  // Check constraints
  const constraintCheck = await dct.checkConstraints(chain, {
    amount,
    reason
  });
  
  if (!constraintCheck.passed) {
    throw new Error(`Constraint violation: ${constraintCheck.failures.join(', ')}`);
  }
  
  // Execute the action
  const result = await refundService.process(orderId, amount, reason);
  
  // Record with full chain
  await dct.recordAction({
    agent: currentAgent.id,
    action: {
      type: 'tool_call',
      tool: 'initiate_refund',
      params: { orderId, amount, reason }
    },
    delegationChain: chain.ids,
    conversation: currentConversation,
    result
  });
  
  return result;
}
```

### Querying History

```typescript
// What actions did this agent take?
const actions = await dct.queryActions({
  agent: 'voice-agent-001',
  after: '2026-02-01',
  capability: 'use:tool:initiate_refund'
});

// Who authorized this specific action?
const chain = await dct.getActionChain('act_xyz789');
// Returns full delegation path from policy → action

// What actions were taken under this policy?
const policyActions = await dct.queryByDelegation({
  delegationId: 'del_policy_refund',
  includeDescendants: true
});
```

---

## Concierge Patterns

### Conversation-Scoped Delegation

Each conversation gets ephemeral delegation:

```typescript
async function startConversation(customerId: string, playbook: string) {
  // Create conversation-scoped delegation
  const sessionDelegation = await dct.delegate({
    delegator: { type: 'role', id: getAgentRole() },
    delegatee: { type: 'agent', id: currentAgent.id },
    capability: `act:conversation:${currentConversation.id}`,
    constraints: {
      customerId,
      playbook,
      expiresAt: Date.now() + 3600000  // 1 hour
    }
  });
  
  return sessionDelegation;
}
```

### Human Override

When human takes over:

```typescript
async function humanOverride(action: string, params: any) {
  // Record human delegation (bypasses normal chain)
  const override = await dct.delegate({
    delegator: { type: 'human', id: currentHuman.id },
    delegatee: { type: 'agent', id: currentAgent.id },
    capability: `override:${action}`,
    constraints: params,
    context: {
      reason: 'Customer escalation',
      conversationId: currentConversation.id
    }
  });
  
  // Execute with human authority
  return executeWithDelegation(action, params, override);
}
```

### Escalation Path

When agent can't act, record the escalation:

```typescript
async function escalateToHuman(action: string, reason: string) {
  await dct.recordEscalation({
    agent: currentAgent.id,
    requestedCapability: action,
    reason,
    conversation: currentConversation,
    chainAttempted: await dct.resolveChain({
      agent: currentAgent.id,
      capability: action
    })
  });
  
  // Notify human queue
  return notifyHumanQueue({
    type: 'escalation',
    agent: currentAgent.id,
    action,
    reason,
    customer: currentCustomer
  });
}
```

---

## Audit Queries

### Compliance Review

```typescript
// All refunds > $50 in Q1
const largeRefunds = await dct.queryActions({
  tool: 'initiate_refund',
  after: '2026-01-01',
  before: '2026-03-31',
  filter: { 'params.amount': { $gt: 50 } }
});

// For each, get full authorization chain
for (const action of largeRefunds) {
  const chain = await dct.getActionChain(action.id);
  console.log(`Refund ${action.params.amount}: authorized by ${chain.root.delegator.name}`);
}
```

### Incident Investigation

```typescript
// Customer complained about action on Feb 15
const incident = await dct.queryActions({
  customerId: '12345',
  after: '2026-02-15T00:00:00Z',
  before: '2026-02-15T23:59:59Z'
});

// Get full context for each action
for (const action of incident) {
  const details = await dct.getFullContext(action.id);
  // Includes: conversation transcript, delegation chain, constraint checks
}
```

---

## Integration with FDAA + ACC

```
┌─────────────────────────────────────────────────────────────┐
│  ACC: "Can this agent do this?"                             │
│  └── Checks capability token                                │
├─────────────────────────────────────────────────────────────┤
│  DCT: "Who authorized this agent to do this?"               │
│  └── Records delegation chain + action                      │
├─────────────────────────────────────────────────────────────┤
│  FDAA: "What changed as a result?"                          │
│  └── Snapshots file with DCT action reference               │
└─────────────────────────────────────────────────────────────┘
```

Example flow:

```typescript
async function executeAction(tool: string, params: any) {
  // 1. ACC: Check capability
  const allowed = await acc.check(token, `use:tool:${tool}`);
  
  // 2. DCT: Get delegation chain
  const chain = await dct.resolveChain({ agent: agentId, capability: `use:tool:${tool}` });
  
  // 3. Execute
  const result = await tools[tool](params);
  
  // 4. DCT: Record action
  const actionId = await dct.recordAction({ action: { tool, params }, chain });
  
  // 5. FDAA: If file changed, link to action
  if (result.filesModified) {
    for (const path of result.filesModified) {
      await fdaa.snapshot({ 
        path, 
        metadata: { dctActionId: actionId } 
      });
    }
  }
}
```

---

## Related

- [DCT Spec](https://github.com/Substr8-Labs/dct)
- [ACC Integration](ACC-INTEGRATION.md)
- [FDAA Integration](FDAA-INTEGRATION.md)
