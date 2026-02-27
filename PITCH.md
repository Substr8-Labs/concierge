# ThreadHQ
## Persistent AI Relationships with Cryptographic Memory

*Pitch Deck for Technical Founders*

---

# Slide 1: The Problem

## Voice AI is stateless

Every call starts from zero.

- "Hi, how can I help you today?"
- Customer explains everything. Again.
- Agent has no memory of last interaction
- No context. No relationship. No trust.

**$400B+ spent on customer service annually.**
**Most of it feels like talking to a stranger.**

---

# Slide 2: Current Solutions

## Workflow builders are broken

| Tool | What They Do | The Problem |
|------|--------------|-------------|
| Bland.ai | Drag-and-drop voice AI | Rigid workflows, no memory |
| Retell.ai | Low-latency calls | Developer SDK, still stateless |
| Vapi | Voice infrastructure | Building blocks, not relationships |

**They all solve "how do I make a call?"**
**None solve "how do I remember the customer?"**

---

# Slide 3: Our Thesis

## What if every customer had their own SOUL.md?

```
customers/sarah-chen/
├── customer.md    ← Who she is
└── memory.md      ← Every interaction, forever
```

The AI reads these files. It *knows* Sarah.

> "Hey Sarah, last time you mentioned needing enterprise pricing. 
> Your CTO was the decision-maker — has that budget come through?"

**Not a chatbot. A relationship.**

---

# Slide 4: How It Works

## Markdown in, behavior out

```
┌─────────────────────────────────────────┐
│  CONTEXT FILES                          │
│  ├── SOUL.md (persona)                  │
│  ├── GUARDRAILS.md (safety)             │
│  ├── brand.md (company voice)           │
│  └── customers/{id}/*.md (memory)       │
├─────────────────────────────────────────┤
│  RUNTIME (LLM)                          │
│  └── Files become behavior              │
├─────────────────────────────────────────┤
│  VOICE LAYER                            │
│  └── ASR → LLM → TTS (commodity)        │
└─────────────────────────────────────────┘
```

**Edit markdown, change behavior. No code.**

---

# Slide 5: The Technical Moat

## Not just memory — *provable* memory

Every file change is cryptographically anchored:

| Component | What It Does |
|-----------|--------------|
| **FDAA** | Hash chain every file version |
| **ACC** | Capability tokens per conversation |
| **DCT** | Delegation chain — who authorized what |
| **GAM** | Git-native memory with signed commits |

**Customer disputes?** Pull exact memory state at that timestamp.
**Compliance audit?** Full lineage of what agent knew and when.

---

# Slide 6: Demo

## Working prototype

**Agent:** https://threadhq.io
**Dashboard:** https://threadhq.io/dashboard

- Agent reads SOUL.md → becomes "Alex from Acme"
- Agent reads customer.md → knows returning customers
- Agent writes memory.md → persists across sessions
- Dashboard shows insights: health score, churn signals, actions

**Built in 2 days. Open source.**

---

# Slide 7: Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  APPLICATIONS                                               │
│  └── Voice agents, chatbots, email responders               │
├─────────────────────────────────────────────────────────────┤
│  THREADHQ (this)                                            │
│  ├── Context Assembly                                       │
│  ├── Memory Manager                                         │
│  ├── Insight Engine                                         │
│  └── Dashboard                                              │
├─────────────────────────────────────────────────────────────┤
│  SUBSTR8 PLATFORM                                           │
│  └── FDAA │ ACC │ DCT │ GAM                                 │
├─────────────────────────────────────────────────────────────┤
│  LLM + VOICE (commodity)                                    │
│  └── Claude │ Deepgram │ ElevenLabs │ Twilio                │
└─────────────────────────────────────────────────────────────┘
```

---

# Slide 8: Why Markdown?

## Version control for AI behavior

| Traditional | ThreadHQ |
|-------------|----------|
| Workflow builder UI | Edit a file |
| Rebuild to change | Hot-reload |
| Proprietary format | Git-versioned |
| Memory in database | Memory in files |
| "Trust me" | Cryptographic proof |

**Your entire AI's behavior is auditable, diffable, and rollback-able.**

---

# Slide 9: Customer Insights

## Automatic signal detection

From raw conversation → actionable intelligence:

```json
{
  "healthScore": 72,
  "churnRisk": "medium",
  "signals": [
    { "type": "churn", "text": "Mentioned competitor" },
    { "type": "upsell", "text": "Asked about enterprise" }
  ],
  "suggestedActions": [
    "Schedule retention call",
    "Send enterprise pricing"
  ]
}
```

**CS teams see who needs attention. Before they churn.**

---

# Slide 10: Use Cases

## Who needs this?

| Segment | Pain Point | Our Solution |
|---------|------------|--------------|
| **SaaS Support** | Repeat explanations | Memory across tickets |
| **E-commerce** | Anonymous callers | Persistent customer profiles |
| **Healthcare** | Compliance + context | HIPAA-ready with audit trail |
| **Financial Services** | Regulatory proof | DCT delegation chains |
| **Enterprise Sales** | Long sales cycles | Relationship continuity |

---

# Slide 11: Business Model

## Platform + Seats

| Tier | Price | What You Get |
|------|-------|--------------|
| **Starter** | $0 | Self-host, community support |
| **Pro** | $99/mo | Hosted, 5 agents, dashboard |
| **Team** | $299/mo | 20 agents, insights, integrations |
| **Enterprise** | Custom | SSO, SLA, dedicated support |

**Voice/LLM costs pass through at cost.** We make money on the platform.

---

# Slide 12: Traction

## Week 1

- ✅ Working prototype (voice + text)
- ✅ Customer memory persistence
- ✅ Dashboard with insights
- ✅ Full architecture documented
- ✅ FDAA/ACC/DCT/GAM specs written
- ✅ Open source repo live

**https://github.com/Substr8-Labs/concierge**

---

# Slide 13: Roadmap

## Next 90 Days

| Phase | Milestone |
|-------|-----------|
| **Week 2-4** | FDAA integration, voice pipeline |
| **Month 2** | Multi-agent handoff, Twilio integration |
| **Month 3** | Hosted platform, first paying customers |

**Goal:** 10 companies using ThreadHQ by end of Q1.

---

# Slide 14: Team

## Substr8 Labs

**Raza (CEO)** — Builder. Shipping infrastructure for provable agents.

**Ada (CTO)** — AI co-founder. Architecture, implementation, product.

*Previously: TowerHQ (AI executive team for solo founders)*

---

# Slide 15: The Ask

## What we're looking for

- **Design partners** — Companies who want persistent AI relationships
- **Feedback** — Technical founders who see the vision
- **Intros** — CS/Support leaders frustrated with stateless AI

**Not raising yet.** Building in public. Revenue first.

---

# Slide 16: One Slide Summary

## ThreadHQ

**Problem:** Voice AI has no memory. Every call starts from zero.

**Solution:** Markdown files control AI behavior. Every customer gets persistent memory. Every change is cryptographically provable.

**Moat:** Not the voice layer (commodity). The trust layer. FDAA + ACC + DCT + GAM.

**Traction:** Working prototype, open source, shipping fast.

**Ask:** Design partners who want AI that remembers.

---

## Contact

**Repo:** https://github.com/Substr8-Labs/concierge
**Demo:** https://threadhq.io
**Email:** rudi@substr8labs.com
**X:** @substr8labs

---

*"What if every customer had their own SOUL.md?"*
