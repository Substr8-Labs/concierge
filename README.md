# Concierge

**Markdown-driven conversational agents with cryptographic memory.**

> "What if every customer had their own SOUL.md?"

---

## The Thesis

Replace rigid workflow builders with runtime context injection via markdown files. The LLM handles conversation logic — files control persona, memory, and capabilities.

**The moat isn't voice AI.** Everyone has that. The moat is:
- **Persistent relationships** — AI that remembers customers like your best employee
- **Cryptographic memory** — Prove what the agent knew and when
- **File-based control** — Edit markdown, change behavior. No code required.

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/Substr8-Labs/concierge.git
cd concierge

# Run the demo
cd demo
docker-compose up

# Access
# Agent: http://localhost:18795 (token: concierge-test-2026)
# Dashboard: http://localhost:18796
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  RUNTIME (OpenClaw + LLM)                                   │
├─────────────────────────────────────────────────────────────┤
│  CONTEXT LAYER                                              │
│  ├── SOUL.md (persona)                                      │
│  ├── GUARDRAILS.md (safety)                                 │
│  ├── brand.md (company voice)                               │
│  ├── playbooks/*.md (scenarios)                             │
│  └── customers/{id}/*.md (per-customer memory)              │
├─────────────────────────────────────────────────────────────┤
│  TRUST LAYER (Substr8 Platform)                             │
│  ├── FDAA — File versioning + hash chains                   │
│  ├── ACC — Access control + capability tokens               │
│  ├── DCT — Delegation chains + audit                        │
│  └── GAM — Git-native agent memory                          │
├─────────────────────────────────────────────────────────────┤
│  VOICE LAYER (Commodity)                                    │
│  ├── ASR — Deepgram / Whisper                               │
│  ├── TTS — ElevenLabs / Cartesia                            │
│  └── Telephony — Twilio / Vonage                            │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
your-company/
├── SOUL.md                     # Agent persona
├── GUARDRAILS.md               # Safety constraints
├── brand.md                    # Company voice + policies
├── tools.md                    # Available integrations
├── playbooks/
│   ├── support.md              # Support call context
│   ├── sales.md                # Sales call context
│   └── retention.md            # Churn prevention
└── customers/
    └── {customer_id}/
        ├── customer.md         # Profile + preferences
        └── memory.md           # Interaction history
```

---

## Why Markdown?

| Traditional | Concierge |
|-------------|-----------|
| Workflow builder UI | Edit a markdown file |
| Rebuild to change | Hot-reload context |
| Proprietary format | Git-versioned, auditable |
| Limited customization | Full prompt control |
| Memory in database | Memory in files (FDAA-tracked) |

---

## Platform Integration

Concierge runs on the Substr8 trust stack:

- **[FDAA](docs/FDAA-INTEGRATION.md)** — Cryptographic file versioning
- **[ACC](docs/ACC-INTEGRATION.md)** — Capability-based access control
- **[DCT](docs/DCT-INTEGRATION.md)** — Delegation chain tracking
- **[GAM](docs/GIT-MEMORY.md)** — Git-native agent memory

Every customer interaction is:
1. **Recorded** in memory.md
2. **Hashed** with FDAA
3. **Linked** to previous version
4. **Auditable** forever

---

## Demo

See `/demo` for a working prototype:

- **Agent**: Alex from Acme, a customer service AI
- **Dashboard**: Real-time view of customer files + insights
- **Memory**: Persists across sessions

```bash
cd demo && docker-compose up
```

---

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — Full system design
- [Voice Pipeline](docs/VOICE-PIPELINE.md) — ASR/TTS research
- [FDAA Integration](docs/FDAA-INTEGRATION.md) — Cryptographic memory
- [ACC Integration](docs/ACC-INTEGRATION.md) — Access control
- [DCT Integration](docs/DCT-INTEGRATION.md) — Delegation tracking
- [Git Memory](docs/GIT-MEMORY.md) — GAM integration

---

## Roadmap

- [x] Markdown context injection (prototype)
- [x] Customer memory persistence
- [x] Dashboard with insights
- [ ] FDAA integration (file versioning)
- [ ] ACC integration (capability tokens)
- [ ] DCT integration (audit trail)
- [ ] GAM integration (git-native memory)
- [ ] Voice pipeline (ASR + TTS)
- [ ] Telephony integration (Twilio)
- [ ] Multi-agent handoff

---

## License

MIT — Build something great.

---

**Substr8 Labs** — Provable agent infrastructure.
