# ACC Integration

*Capability-based access control for agents*

---

## Why ACC?

Agents need to do things. They shouldn't do everything.

ACC (Agent Capability Control) governs:
- What files an agent can read/write
- What tools an agent can use
- What actions require approval

---

## Capability Model

### Token Structure

```json
{
  "id": "cap_xyz789",
  "agent": "voice-agent-001",
  "issued": "2026-02-22T10:00:00Z",
  "expires": "2026-02-22T11:00:00Z",
  "capabilities": [
    "read:customer:12345",
    "write:memory:12345",
    "use:tool:check_order_status",
    "use:tool:create_ticket"
  ],
  "constraints": {
    "maxToolCalls": 10,
    "maxWriteBytes": 10000,
    "requireApproval": ["initiate_refund"]
  },
  "context": {
    "conversationId": "conv_abc123",
    "customerId": "12345"
  }
}
```

### Capability Types

| Capability | Format | Example |
|------------|--------|---------|
| Read file | `read:{type}:{id}` | `read:customer:12345` |
| Write file | `write:{type}:{id}` | `write:memory:12345` |
| Use tool | `use:tool:{name}` | `use:tool:refund` |
| All in category | `read:customer:*` | All customers |
| Scoped wildcard | `use:tool:crm:*` | All CRM tools |

---

## Concierge Integration

### On Conversation Start

```typescript
import { acc } from '@substr8/acc';

async function startConversation(customerId: string) {
  // Issue capability token for this conversation
  const token = await acc.issue({
    agent: currentAgent.id,
    ttl: '1h',
    capabilities: [
      `read:customer:${customerId}`,
      `read:memory:${customerId}`,
      `write:memory:${customerId}`,
      'use:tool:check_order_status',
      'use:tool:create_ticket',
      'use:tool:schedule_callback'
    ],
    constraints: {
      maxToolCalls: 20,
      requireApproval: ['initiate_refund', 'cancel_subscription']
    }
  });
  
  // Token travels with agent context
  return { token, customerId };
}
```

### On File Access

```typescript
async function readCustomerFile(customerId: string, filename: string) {
  const path = `customers/${customerId}/${filename}`;
  
  // Check capability
  const allowed = await acc.check(currentToken, `read:customer:${customerId}`);
  if (!allowed) {
    throw new Error(`Access denied: cannot read ${path}`);
  }
  
  return fs.readFile(path, 'utf-8');
}
```

### On Tool Call

```typescript
async function callTool(toolName: string, params: any) {
  // Check if tool is allowed
  const allowed = await acc.check(currentToken, `use:tool:${toolName}`);
  if (!allowed) {
    throw new Error(`Access denied: cannot use tool ${toolName}`);
  }
  
  // Check if approval required
  if (currentToken.constraints.requireApproval?.includes(toolName)) {
    const approved = await requestHumanApproval({
      tool: toolName,
      params,
      context: currentConversation
    });
    if (!approved) {
      return { status: 'denied', reason: 'Human declined' };
    }
  }
  
  return executeToolCall(toolName, params);
}
```

---

## Constraint Enforcement

### Max Tool Calls

```typescript
let toolCallCount = 0;

async function callTool(toolName: string, params: any) {
  if (toolCallCount >= currentToken.constraints.maxToolCalls) {
    throw new Error('Tool call limit reached for this conversation');
  }
  
  // ... execute
  toolCallCount++;
}
```

### Max Write Bytes

```typescript
let writtenBytes = 0;

async function writeFile(path: string, content: string) {
  const bytes = Buffer.byteLength(content);
  if (writtenBytes + bytes > currentToken.constraints.maxWriteBytes) {
    throw new Error('Write limit exceeded');
  }
  
  // ... write
  writtenBytes += bytes;
}
```

---

## Capability Escalation

Sometimes agents need more. Request pattern:

```typescript
async function requestCapabilityEscalation(capability: string, reason: string) {
  // Log the request
  await acc.logEscalationRequest({
    agent: currentAgent.id,
    capability,
    reason,
    context: currentConversation
  });
  
  // Automated rules check
  const autoApproved = await acc.evaluateEscalation({
    capability,
    agentTrustLevel: currentAgent.trustLevel,
    customerTier: currentCustomer.tier
  });
  
  if (autoApproved) {
    // Issue new token with additional capability
    const newToken = await acc.extend(currentToken, [capability]);
    return { granted: true, token: newToken };
  }
  
  // Otherwise, queue for human review
  return { granted: false, pending: true, requestId: 'req_xyz' };
}
```

---

## Role-Based Defaults

Define capability templates:

```yaml
# acc-config.yaml
roles:
  support_agent:
    capabilities:
      - 'read:customer:$CUSTOMER_ID'
      - 'read:memory:$CUSTOMER_ID'
      - 'write:memory:$CUSTOMER_ID'
      - 'use:tool:check_order_status'
      - 'use:tool:create_ticket'
      - 'use:tool:schedule_callback'
    constraints:
      maxToolCalls: 20
      requireApproval:
        - 'initiate_refund'
        - 'cancel_subscription'
  
  sales_agent:
    capabilities:
      - 'read:customer:$CUSTOMER_ID'
      - 'read:memory:$CUSTOMER_ID'
      - 'write:memory:$CUSTOMER_ID'
      - 'use:tool:create_quote'
      - 'use:tool:schedule_demo'
    constraints:
      maxToolCalls: 15
      requireApproval:
        - 'apply_discount'
  
  retention_agent:
    capabilities:
      - 'read:customer:$CUSTOMER_ID'
      - 'read:memory:$CUSTOMER_ID'
      - 'write:memory:$CUSTOMER_ID'
      - 'use:tool:apply_retention_offer'
      - 'use:tool:cancel_subscription'  # Can do this directly
    constraints:
      maxToolCalls: 25
```

---

## Audit Trail

Every capability check is logged:

```json
{
  "timestamp": "2026-02-22T10:15:30Z",
  "agent": "voice-agent-001",
  "tokenId": "cap_xyz789",
  "capability": "use:tool:initiate_refund",
  "decision": "allowed",
  "approvalRequired": true,
  "approvalStatus": "pending",
  "context": {
    "conversationId": "conv_abc123",
    "customerId": "12345"
  }
}
```

Query the audit:

```typescript
const actions = await acc.audit({
  agent: 'voice-agent-001',
  after: '2026-02-01',
  capabilities: ['use:tool:*']
});
```

---

## Integration Points

### With FDAA

When ACC allows a write, FDAA records it:

```typescript
async function writeWithAuth(path: string, content: string) {
  // ACC: Check permission
  await acc.check(token, `write:${getCapabilityType(path)}`);
  
  // Write file
  await fs.writeFile(path, content);
  
  // FDAA: Record with actor from ACC token
  await fdaa.snapshot({
    path,
    content,
    actor: token.agent,
    metadata: { tokenId: token.id }
  });
}
```

### With DCT

When action is delegated, DCT references the capability:

```typescript
const delegation = await dct.record({
  capability: 'use:tool:initiate_refund',
  delegatedBy: 'human-operator-jane',
  delegatedTo: 'voice-agent-001',
  constraints: { maxAmount: 100 },
  accTokenId: currentToken.id
});
```

---

## Concierge-Specific Patterns

### Multi-Customer Handling

Agent might handle multiple customers in a shift:

```typescript
// Issue scoped token per conversation
function onNewConversation(customerId) {
  // Old token revoked, new one issued
  const token = acc.issue({
    agent: agentId,
    capabilities: scopedTo(customerId)
  });
  setCurrentToken(token);
}
```

### Handoff Between Agents

When support → sales handoff:

```typescript
async function handoffToSales(salesAgentId: string) {
  // Create new token for sales agent
  const salesToken = await acc.issue({
    agent: salesAgentId,
    capabilities: salesCapabilities(currentCustomerId),
    context: {
      handoffFrom: currentAgent.id,
      reason: 'customer interested in upgrade'
    }
  });
  
  // Revoke current agent's token
  await acc.revoke(currentToken.id);
  
  // Transfer conversation
  return { salesToken, conversationId: currentConversation.id };
}
```

---

## Related

- [ACC Spec](https://github.com/Substr8-Labs/acc)
- [FDAA Integration](FDAA-INTEGRATION.md)
- [DCT Integration](DCT-INTEGRATION.md)
