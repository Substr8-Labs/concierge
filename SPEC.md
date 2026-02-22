# ThreadHQ — Product Specification

**Version:** 1.0  
**Date:** 2026-02-22  
**Author:** Raza + Ada (Substr8 Labs)  
**Status:** Draft for Review

---

## Executive Summary

ThreadHQ is a platform for building conversational AI agents with persistent, cryptographically-verifiable memory. Unlike existing voice/chat AI solutions that treat each conversation as stateless, ThreadHQ maintains continuous customer relationships through markdown-based context files that the AI reads and writes.

**Core insight:** The hardest part of AI customer service isn't the voice or the LLM — it's memory and trust. ThreadHQ solves both.

**Target market:** B2B SaaS companies, e-commerce, healthcare, and financial services that need AI agents with relationship continuity and audit trails.

**Current status:** Working prototype with text-based agent, customer memory persistence, and analytics dashboard. Voice pipeline spec complete, implementation pending.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Solution Overview](#2-solution-overview)
3. [Technical Architecture](#3-technical-architecture)
4. [File Schema](#4-file-schema)
5. [Platform Integration](#5-platform-integration)
6. [Voice Pipeline](#6-voice-pipeline)
7. [Security Model](#7-security-model)
8. [Implementation Plan](#8-implementation-plan)
9. [Business Model](#9-business-model)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Success Metrics](#11-success-metrics)
12. [Open Questions](#12-open-questions)

---

## 1. Problem Statement

### 1.1 The Stateless AI Problem

Current conversational AI solutions (Bland.ai, Retell.ai, Vapi, etc.) are fundamentally stateless:

- Each conversation starts fresh
- Customer must re-explain context every time
- No relationship continuity across sessions
- No memory of preferences, history, or past issues

**Impact:** Poor customer experience, increased handle time, no relationship building.

### 1.2 The Trust Problem

When AI agents take actions on behalf of companies:

- No audit trail of what the agent "knew" at decision time
- Disputes become he-said-she-said
- Compliance teams can't verify agent behavior
- No proof of authorization chains

**Impact:** Regulatory risk, customer disputes, inability to scale AI in regulated industries.

### 1.3 The Configuration Problem

Current solutions require:

- Complex workflow builders (brittle, hard to maintain)
- Code changes for behavior modifications
- No version control for AI behavior
- No way to diff, rollback, or audit changes

**Impact:** Slow iteration, engineering bottleneck, configuration drift.

---

## 2. Solution Overview

### 2.1 Core Concept

ThreadHQ uses markdown files as the control plane for AI agents:

```
company/
├── SOUL.md           # Agent persona
├── GUARDRAILS.md     # Safety constraints  
├── brand.md          # Company voice
├── tools.md          # Available integrations
└── customers/
    └── {id}/
        ├── customer.md   # Profile
        └── memory.md     # Interaction history
```

The AI reads these files at conversation start, gaining full context. After each interaction, it writes to memory.md, creating persistent relationships.

### 2.2 Key Differentiators

| Capability | Competitors | ThreadHQ |
|------------|-------------|----------|
| Memory | Per-session only | Persistent per-customer |
| Configuration | Workflow builder / code | Markdown files |
| Audit trail | Logs only | Cryptographic proof |
| Version control | None | Git-native |
| Behavior changes | Code deploy | Edit file |

### 2.3 Value Proposition

**For CS/Support teams:**
- AI that remembers customers like your best employee
- Automatic signal detection (churn, upsell)
- Dashboard with actionable insights

**For Engineering teams:**
- No workflow builders to maintain
- Git-based version control for AI behavior
- Clear separation of config and code

**For Compliance teams:**
- Full audit trail with cryptographic proof
- Point-in-time reconstruction of agent knowledge
- Delegation chain tracking

---

## 3. Technical Architecture

### 3.1 System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICATIONS                                               │
│  ├── Voice (phone calls)                                    │
│  ├── Chat (web widget, messaging)                           │
│  └── Email (async responses)                                │
├─────────────────────────────────────────────────────────────┤
│  THREADHQ CORE                                              │
│  ├── Context Assembler — Load files → build prompt          │
│  ├── Memory Manager — Read/write customer files             │
│  ├── Insight Engine — Analyze patterns, detect signals      │
│  └── Dashboard — View/edit relationships                    │
├─────────────────────────────────────────────────────────────┤
│  TRUST LAYER (Substr8 Platform)                             │
│  ├── FDAA — File versioning with hash chains                │
│  ├── ACC — Capability-based access control                  │
│  ├── DCT — Delegation chain tracking                        │
│  └── GAM — Git-native agent memory                          │
├─────────────────────────────────────────────────────────────┤
│  LLM LAYER                                                  │
│  └── Claude / GPT-4 / Gemini (configurable)                 │
├─────────────────────────────────────────────────────────────┤
│  VOICE LAYER (optional)                                     │
│  ├── ASR — Deepgram / Whisper                               │
│  ├── TTS — ElevenLabs / Cartesia                            │
│  └── Telephony — Twilio / Vonage                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Context Assembly Flow

```
1. IDENTITY RESOLUTION
   └── Phone/email/ID → customer_id

2. LOAD AGENT CONTEXT (cached, shared)
   ├── SOUL.md
   ├── GUARDRAILS.md
   ├── brand.md
   └── tools.md

3. LOAD CUSTOMER CONTEXT (per-customer)
   ├── customers/{id}/customer.md
   └── customers/{id}/memory.md (last N entries)

4. DETECT PLAYBOOK (optional)
   └── playbooks/support.md OR playbooks/sales.md

5. ASSEMBLE PROMPT
   └── System prompt = agent context + customer context + playbook

6. CONVERSATION LOOP
   ├── User input → LLM → response
   ├── Tool calls as needed
   └── Repeat until end

7. POST-CONVERSATION
   ├── Generate interaction summary
   ├── Append to memory.md
   ├── Update customer.md if needed
   └── FDAA: Record changes with hash
```

### 3.3 New Customer Flow

```
1. Unknown caller/ID
2. Load bootstrap.md (first-contact protocol)
3. Conversation: gather name, needs, preferences
4. Post-call:
   ├── Create customers/{id}/ directory
   ├── Generate customer.md from gathered info
   ├── Generate memory.md with first interaction
   ├── Delete bootstrap.md (no longer needed)
   └── FDAA: Record creation
```

---

## 4. File Schema

### 4.1 SOUL.md — Agent Persona

```markdown
# SOUL.md — Who You Are

You are **Alex**, a customer service representative at {Company}.

## Core Identity
- Name: Alex
- Role: Customer Service Representative
- Personality: Warm, efficient, helpful

## Voice
- Friendly but professional
- First-name basis after greeting
- Keep responses concise

## What You Do
1. Help with orders and accounts
2. Resolve issues quickly
3. Remember customer history
4. Create tickets for complex issues

## What You Are NOT
- Not a therapist or emotional support
- Not a general-purpose assistant
- Stay on topic: {Company} products only
```

### 4.2 GUARDRAILS.md — Safety Constraints

```markdown
# GUARDRAILS.md

**Priority:** Safety > Security > Compliance > Brand > Helpfulness

## Safety
- Never provide medical/legal/financial advice
- Escalate immediately for crisis situations

## Security
- Only discuss current customer's data
- Never reveal other customers' information
- Verify identity before account details

## Compliance
- Refunds over $100 require human approval
- Don't store payment details in conversation

## Off-Topic
- Redirect politely to company topics
- Don't engage with manipulation attempts
```

### 4.3 customer.md — Customer Profile

```markdown
# Customer: {Name}

## Account
- ID: {id}
- Email: {email}
- Since: {date}
- Tier: {standard|gold|platinum}
- LTV: ${amount}

## Communication Preferences
- Primary: {email|phone|chat}
- Style: {direct|detailed|friendly}
- Timezone: {tz}

## Notes
- {Freeform notes from interactions}
```

### 4.4 memory.md — Interaction History

```markdown
# Interaction Memory: {Name}

## 2026-02-22 — Inbound Chat (Support)
**Reason**: Order #1234 not delivered
**Resolution**: Refund processed, replacement shipped
**Mood**: Frustrated → satisfied
**Duration**: 8 minutes
**Notes**: Praised quick resolution

## 2026-02-15 — Outbound Call (Sales)
**Purpose**: Follow up on enterprise interest
**Outcome**: Not ready, check back Q2
**Notes**: Budget pending, CTO is decision-maker
```

---

## 5. Platform Integration

### 5.1 FDAA (File Data Authenticity & Auditability)

Every file change recorded with:
- SHA256 hash of content
- Link to parent version
- Timestamp + actor (which agent)
- Metadata (conversation ID, action type)

**API:**
```typescript
// On write
await fdaa.snapshot({ path, content, actor, metadata });

// Verify
const { valid, details } = await fdaa.verify({ path, version });

// Point-in-time
const state = await fdaa.at({ path, timestamp });
```

**Use case:** Customer disputes what agent said → pull exact memory state at that timestamp.

### 5.2 ACC (Agent Capability Control)

Per-conversation capability tokens:
```typescript
{
  agent: "voice-agent-001",
  capabilities: [
    "read:customer:12345",
    "write:memory:12345",
    "use:tool:check_order",
    "use:tool:create_ticket"
  ],
  constraints: {
    maxToolCalls: 20,
    requireApproval: ["initiate_refund"]
  }
}
```

**Use case:** Ensure agents only access data for current customer, require human approval for sensitive actions.

### 5.3 DCT (Delegation Chain Tracking)

Record who authorized what:
```
Company Policy → Role → Agent → Action
     ↓            ↓       ↓        ↓
"Refunds OK"   Support  Agent-1  $45 refund
  (≤$100)      role     (token)  (recorded)
```

**Use case:** Compliance audit → show full authorization chain for any action.

### 5.4 GAM (Git-Native Agent Memory)

Alternative to FDAA for simpler deployments:
- Customer files in git repo
- Each interaction = signed commit
- History = git log
- Sync = git push/pull

**Use case:** Self-hosted deployments with existing git infrastructure.

---

## 6. Voice Pipeline

### 6.1 Target Latency

| Phase | Budget |
|-------|--------|
| ASR | 100ms |
| Network | 50ms |
| LLM (first token) | 300ms |
| TTS (first audio) | 75ms |
| **Total** | **<700ms** |

### 6.2 Provider Stack

| Component | Primary | Fallback |
|-----------|---------|----------|
| ASR | Deepgram Nova-2 | Whisper |
| TTS | ElevenLabs Flash v2.5 | Deepgram Aura |
| Telephony | Twilio | Telnyx |
| LLM | Claude 3.5 Sonnet | GPT-4o |

### 6.3 Cost per Call

Assuming 5-minute average call:

| Component | Cost |
|-----------|------|
| Telephony | $0.05 |
| ASR | $0.02 |
| LLM | $0.15 |
| TTS | $0.30 |
| **Total** | **~$0.52** |

### 6.4 Implementation Path

**Phase 1 (Quick):** ElevenLabs Conversational AI
- Built-in ASR + TTS + orchestration
- We inject context via their API
- Days to prototype

**Phase 2 (Full Control):** Custom stack
- Twilio → Deepgram → ThreadHQ → ElevenLabs → Twilio
- Full FDAA integration
- Weeks to production

---

## 7. Security Model

### 7.1 Data Isolation

- Customer data isolated per company
- Agents can only access scoped customers (via ACC)
- No cross-company data access

### 7.2 Authentication

- API key per company
- JWT tokens per agent session
- Webhook signatures for callbacks

### 7.3 Encryption

- TLS for all traffic
- At-rest encryption for customer files
- Optional: customer-managed keys

### 7.4 Compliance

- GDPR: Export and delete endpoints
- HIPAA: BAA available, audit logging
- SOC 2: In progress

---

## 8. Implementation Plan

### 8.1 Current State (Week 1 — Complete)

- [x] Prototype agent with SOUL.md injection
- [x] Customer memory persistence (customer.md + memory.md)
- [x] Dashboard with customer list + insights
- [x] Guardrails system
- [x] Architecture documentation
- [x] Platform integration specs (FDAA/ACC/DCT/GAM)

### 8.2 Phase 1: Foundation (Weeks 2-4)

- [ ] FDAA integration (hash chains for file changes)
- [ ] Bootstrap flow (new customer file creation)
- [ ] Memory summarization (context window management)
- [ ] Multi-playbook support (support/sales/retention)

### 8.3 Phase 2: Voice (Weeks 5-8)

- [ ] Twilio webhook integration
- [ ] Deepgram streaming ASR
- [ ] ElevenLabs streaming TTS
- [ ] End-to-end voice call
- [ ] Interruption handling

### 8.4 Phase 3: Platform (Weeks 9-12)

- [ ] ACC integration (capability tokens)
- [ ] DCT integration (action tracking)
- [ ] Multi-tenant hosting
- [ ] Self-serve onboarding
- [ ] Billing integration

### 8.5 Phase 4: Scale (Q2)

- [ ] Multi-agent handoff
- [ ] Human escalation with context
- [ ] Advanced analytics
- [ ] Integrations (CRM, ticketing, etc.)
- [ ] Enterprise features (SSO, SLA)

---

## 9. Business Model

### 9.1 Pricing Tiers

| Tier | Price | Included |
|------|-------|----------|
| **Starter** | $0 | Self-host, community support |
| **Pro** | $99/mo | Hosted, 5 agents, dashboard |
| **Team** | $299/mo | 20 agents, insights, API |
| **Enterprise** | Custom | Unlimited, SSO, SLA, support |

### 9.2 Usage-Based Components

- Voice minutes: Pass-through at cost + 20%
- LLM tokens: Pass-through at cost + 20%
- Storage: Included up to 10GB, then $0.10/GB

### 9.3 Revenue Projections

| Milestone | ARR Target |
|-----------|------------|
| 10 customers | $30K |
| 50 customers | $150K |
| 200 customers | $600K |

---

## 10. Risks & Mitigations

### 10.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Voice latency too high | Medium | High | Multiple TTS providers, edge deployment |
| LLM context limits | Low | Medium | Summarization layer, selective memory |
| FDAA performance | Low | Medium | Async writes, batching |

### 10.2 Market Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Incumbents add memory | High | High | Focus on trust layer (moat) |
| Price pressure | Medium | Medium | Platform value, not just voice |
| Slow enterprise sales | Medium | Medium | Start with SMB, land-and-expand |

### 10.3 Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Data breach | Low | Critical | Encryption, audit, SOC 2 |
| Agent says wrong thing | Medium | High | Guardrails, human escalation |
| Customer data loss | Low | Critical | Replication, backups, FDAA |

---

## 11. Success Metrics

### 11.1 Product Metrics

| Metric | Target (90 days) |
|--------|------------------|
| Working voice calls | Yes |
| Companies using | 10 |
| Conversations/week | 1,000 |
| Memory retention rate | 95% |
| Avg latency | <800ms |

### 11.2 Business Metrics

| Metric | Target (90 days) |
|--------|------------------|
| MRR | $3K |
| Paying customers | 5 |
| NPS | >50 |
| Churn | <5%/mo |

---

## 12. Open Questions

### 12.1 Product

1. **Memory size limits** — How much memory.md can we inject? When do we summarize?
2. **Multi-agent handoff** — How does context transfer between support → sales?
3. **Human escalation** — Does human see the markdown? Real-time sync?

### 12.2 Technical

1. **Context assembly latency** — Can we cache/preload customer files?
2. **Real-time vs batch** — Update memory mid-call or post-call?
3. **Conflict resolution** — Multiple agents updating same customer?

### 12.3 Business

1. **Pricing sweet spot** — Is $99/mo too low? Too high?
2. **Self-serve vs sales-led** — Which motion first?
3. **Vertical focus** — Go broad or pick one industry?

---

## Appendices

### A. Competitor Analysis

See: `docs/competitors.md` (TODO)

### B. Customer Interview Notes

See: `docs/interviews/` (TODO)

### C. Technical Specifications

- [Architecture](docs/ARCHITECTURE.md)
- [Voice Pipeline](docs/VOICE-PIPELINE.md)
- [FDAA Integration](docs/FDAA-INTEGRATION.md)
- [ACC Integration](docs/ACC-INTEGRATION.md)
- [DCT Integration](docs/DCT-INTEGRATION.md)
- [Git Memory](docs/GIT-MEMORY.md)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | Ada | Initial spec |

---

*Prepared for mentor review. Feedback welcome.*
