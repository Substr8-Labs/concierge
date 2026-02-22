# Concierge Architecture

*Full system design for markdown-driven conversational agents*

---

## Overview

Concierge is a **control plane** for conversational AI. It doesn't replace LLMs or voice providers — it orchestrates them with:

1. **Context injection** — Markdown files become agent behavior
2. **Persistent memory** — Every customer has their own files
3. **Cryptographic audit** — FDAA tracks every change
4. **Capability control** — ACC governs what agents can do

---

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICATIONS                                               │
│  └── Voice agents, chatbots, email responders               │
├─────────────────────────────────────────────────────────────┤
│  CONCIERGE (this project)                                   │
│  ├── Context Assembly — Load markdown → inject to LLM       │
│  ├── Memory Manager — Read/write customer files             │
│  ├── Insight Engine — Analyze patterns, detect signals      │
│  └── Dashboard — View/edit customer relationships           │
├─────────────────────────────────────────────────────────────┤
│  SUBSTR8 PLATFORM                                           │
│  ├── FDAA — Immutable file versioning                       │
│  ├── ACC — Capability-based access control                  │
│  ├── DCT — Delegation chain tracking                        │
│  └── GAM — Git-native agent memory                          │
├─────────────────────────────────────────────────────────────┤
│  LLM LAYER                                                  │
│  └── Claude / GPT-4 / Gemini (via OpenClaw or direct)       │
├─────────────────────────────────────────────────────────────┤
│  VOICE LAYER (optional)                                     │
│  ├── ASR — Speech-to-text (Deepgram, Whisper)               │
│  ├── TTS — Text-to-speech (ElevenLabs, Cartesia)            │
│  └── Telephony — Phone calls (Twilio, Vonage)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Context Assembly

When a conversation starts, Concierge assembles context:

```
┌─────────────────────────────────────────────────────────────┐
│  1. IDENTITY RESOLUTION                                     │
│     └── Phone number / email / ID → customer_id             │
├─────────────────────────────────────────────────────────────┤
│  2. LOAD AGENT CONTEXT                                      │
│     ├── SOUL.md → Who the agent is                          │
│     ├── GUARDRAILS.md → What it can't do                    │
│     ├── brand.md → Company voice + policies                 │
│     └── tools.md → Available integrations                   │
├─────────────────────────────────────────────────────────────┤
│  3. LOAD CUSTOMER CONTEXT                                   │
│     ├── customers/{id}/customer.md → Profile                │
│     └── customers/{id}/memory.md → History (last N entries) │
├─────────────────────────────────────────────────────────────┤
│  4. LOAD PLAYBOOK                                           │
│     └── playbooks/support.md (or detect intent)             │
├─────────────────────────────────────────────────────────────┤
│  5. INJECT INTO LLM                                         │
│     └── System prompt = assembled context                   │
└─────────────────────────────────────────────────────────────┘
```

### New Customer Flow

```
If customer_id not found:
  1. Create customers/{id}/ directory
  2. Load bootstrap.md (first-contact protocol)
  3. After conversation:
     - Generate customer.md from gathered info
     - Generate memory.md with first interaction
     - Delete bootstrap.md (no longer needed)
     - FDAA: Record creation in hash chain
```

---

## Memory Management

### File Types

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `customer.md` | Profile, preferences, account info | Rarely (corrections, plan changes) |
| `memory.md` | Interaction history | Every conversation |
| `bootstrap.md` | First-contact script | Deleted after first call |

### Memory.md Structure

```markdown
# Interaction Memory: {Customer Name}

## 2026-02-22 — Inbound Chat (Support)
**Reason**: TV not turning on
**Resolution**: Guided through power cycle, worked
**Mood**: Relieved, satisfied
**Duration**: 5 minutes
**Notes**: Has Hisense 55" 4K, bought 2024

## 2026-02-20 — Inbound Call (Support)
...
```

### Context Window Management

Memory grows. LLMs have limits. Strategy:

1. **Recent bias** — Load last 5-10 interactions fully
2. **Summary layer** — Older interactions as summaries
3. **Relevance filter** — Load more if query relates to history
4. **Token budget** — Hard limit (e.g., 8K tokens for memory)

---

## Insight Engine

Analyzes customer files to surface:

- **Health Score** (0-100) — Overall relationship health
- **Churn Signals** — Cancellation, competitors, frustration, price
- **Upsell Signals** — Team growth, enterprise interest, hitting limits
- **Sentiment Trend** — Improving / stable / declining
- **Topics** — What they talk about most
- **Suggested Actions** — Next best action for CS team

```typescript
// Example output
{
  healthScore: 72,
  churnRisk: 'low',
  upsellPotential: 'medium',
  sentimentTrend: 'stable',
  signals: [
    { type: 'upsell', text: 'Asked about enterprise features' }
  ],
  suggestedActions: [
    { priority: 'medium', action: 'Schedule expansion call', reason: 'Enterprise interest' }
  ]
}
```

---

## Dashboard

Real-time view into customer relationships:

- **Customer List** — All customers, interaction counts
- **Customer Detail** — Profile, memory timeline, raw files
- **Insights Panel** — Health score, signals, actions
- **Telemetry** — Platform stats (FDAA/ACC/DCT)

---

## Security Model

### GUARDRAILS.md Hierarchy

```
1. Safety — Never cause harm
2. Security — Never leak data
3. Compliance — Industry regulations
4. Brand — Company policies
5. Helpfulness — Serve the customer
```

Higher priorities override lower ones. Always.

### Data Boundaries

- **Agent can read**: Own company files, customer files for active conversation
- **Agent can write**: memory.md, customer.md (with constraints)
- **Agent cannot**: Access other companies, delete files, bypass guardrails

---

## Integration Points

### FDAA (File Versioning)

Every write to customer files:
1. Calculate SHA256 of new content
2. Link to previous version hash
3. Record actor (agent ID) + timestamp
4. Store in FDAA registry

```
customers/12345/memory.md
├── v1 (2026-01-15) │ a3f8c2... │ voice-agent
├── v2 (2026-02-10) │ 7b2e91... │ voice-agent
└── v3 (2026-02-22) │ e4d1a0... │ voice-agent
```

### ACC (Access Control)

Capabilities granted per-agent:
- `read:customer:{id}` — Read specific customer files
- `write:memory:{id}` — Append to memory
- `write:customer:{id}` — Update profile
- `use:tool:{name}` — Call specific tools

### DCT (Delegation)

When agent takes action:
1. Record: who delegated, what authority, what constraints
2. Link to conversation turn that triggered it
3. Audit trail for "why did this happen?"

### GAM (Git Memory)

Alternative to FDAA for simpler setups:
- Customer files in git repo
- Each interaction = commit
- History = git log
- Verification = signed commits

---

## Deployment Models

### 1. OpenClaw Hosted

```yaml
# openclaw.json
{
  "workspace": "/path/to/company-config",
  "context": ["SOUL.md", "GUARDRAILS.md", "brand.md", "tools.md"]
}
```

### 2. Self-Hosted

```yaml
# docker-compose.yml
services:
  concierge:
    image: substr8/concierge:latest
    volumes:
      - ./company-config:/workspace
```

### 3. Platform (Multi-tenant)

```
concierge.substr8labs.com
├── /companies/{company_id}/
│   ├── config (SOUL, brand, etc.)
│   └── customers/
└── Dashboard per company
```

---

## Next Steps

1. **FDAA Integration** — Hook file writes to FDAA
2. **ACC Integration** — Capability tokens for agents
3. **Voice Pipeline** — Deepgram + ElevenLabs + Twilio
4. **Multi-agent** — Handoff between support/sales/retention
5. **Platform** — Multi-tenant SaaS version
