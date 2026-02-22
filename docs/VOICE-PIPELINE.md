# Voice Pipeline Architecture

*ASR → LLM → TTS for real-time voice conversations*

---

## The Full Loop

```
┌──────────────────────────────────────────────────────────────────┐
│  [User speaks]                                                    │
│       ↓                                                           │
│  ASR (Speech-to-Text) ───────────────────────────── ~100ms       │
│       ↓                                                           │
│  Text transcript                                                  │
│       ↓                                                           │
│  LLM (Context + Response) ───────────────────────── ~500ms       │
│       ↓                                                           │
│  Response text                                                    │
│       ↓                                                           │
│  TTS (Text-to-Speech) ───────────────────────────── ~75ms        │
│       ↓                                                           │
│  [Agent speaks]                                                   │
│                                                                   │
│  Total latency: ~700ms (acceptable for real-time)                │
└──────────────────────────────────────────────────────────────────┘
```

---

## Provider Comparison (2026)

### ASR (Speech-to-Text)

| Provider | Latency | Accuracy | Price | Notes |
|----------|---------|----------|-------|-------|
| **Deepgram Nova-2** | ~100ms | 95%+ | $0.0043/min | Best for real-time |
| AssemblyAI | ~150ms | 94% | $0.006/min | Good alternative |
| OpenAI Whisper | ~200ms | 93% | $0.006/min | Batch better than RT |
| Google STT | ~150ms | 92% | $0.004/min | Enterprise integration |

**Recommendation**: Deepgram Nova-2 for latency + accuracy balance.

### TTS (Text-to-Speech)

| Provider | Latency | Quality | Price | Notes |
|----------|---------|---------|-------|-------|
| **ElevenLabs Flash v2.5** | ~75ms | Excellent | $0.30/1k chars | Most natural |
| Cartesia Sonic | ~80ms | Great | $0.25/1k chars | Fine-tune controls |
| Deepgram Aura-2 | ~90ms | Good | $0.015/1k chars | 10-20x cheaper |
| OpenAI TTS | ~150ms | Good | $0.015/1k chars | Reliable |
| PlayHT | ~100ms | Good | $0.20/1k chars | Clone voices |

**Recommendation**: ElevenLabs for quality, Deepgram for cost.

### Telephony

| Provider | Price | Notes |
|----------|-------|-------|
| **Twilio** | ~$0.01/min | Industry standard, global |
| Vonage | ~$0.01/min | Good alternative |
| Telnyx | ~$0.005/min | Cheaper, developer-focused |

---

## Build Paths

### Path A: Platform Integration (Days to Prototype)

Use ElevenLabs Conversational AI or similar:

```
┌─────────────────────────────────────────┐
│  ElevenLabs Conversational AI           │
│  ├── Built-in ASR + TTS                 │
│  ├── LLM orchestration                  │
│  └── Telephony integration              │
├─────────────────────────────────────────┤
│  Our integration point:                 │
│  └── Custom knowledge base via API      │
│      (inject markdown context)          │
└─────────────────────────────────────────┘
```

**Pros**: Fast to ship, they handle infra
**Cons**: Less control over context injection, harder to integrate FDAA

### Path B: Full Custom Stack (Weeks to Production)

```
┌─────────────────────────────────────────┐
│  Twilio Voice                           │
│  ├── Inbound: webhook → our server      │
│  └── Outbound: API → dial customer      │
├─────────────────────────────────────────┤
│  Deepgram Streaming ASR                 │
│  └── WebSocket → real-time transcripts  │
├─────────────────────────────────────────┤
│  Concierge Context Assembly             │
│  ├── Load SOUL.md, customer.md, etc.    │
│  └── Inject into LLM prompt             │
├─────────────────────────────────────────┤
│  LLM (Claude / GPT-4)                   │
│  └── Generate response + tool calls     │
├─────────────────────────────────────────┤
│  ElevenLabs Streaming TTS               │
│  └── Text → audio chunks → Twilio       │
├─────────────────────────────────────────┤
│  FDAA                                   │
│  └── Record interaction in memory.md    │
└─────────────────────────────────────────┘
```

**Pros**: Full control, FDAA native, our moat
**Cons**: More engineering, more ops

---

## Latency Budget

Target: **< 1 second** end-to-end response

| Phase | Budget | Strategy |
|-------|--------|----------|
| ASR | 100ms | Use streaming, process while speaking |
| Network | 50ms | Colocate services |
| Context load | 50ms | Cache hot files, preload customer |
| LLM first token | 300ms | Use streaming, start TTS early |
| LLM full response | 500ms | Stream tokens → TTS |
| TTS first audio | 75ms | Sentence-level synthesis |
| **Total** | **~700ms** | Acceptable |

### Streaming Optimization

Don't wait for full LLM response:

```
LLM: "Hi Sarah, I see you're calling about..."
           ↓ (first sentence complete)
TTS: Start synthesizing "Hi Sarah..."
           ↓
Audio: Playing while LLM continues
```

---

## Interruption Handling

Users interrupt. Handle it:

1. **Barge-in detection** — User starts speaking while agent is
2. **Audio cut** — Stop TTS immediately
3. **Context update** — "User interrupted, they said: X"
4. **Resume** — Generate new response acknowledging

```
Agent: "So what I recommend is—"
User: "Actually, wait"
Agent: [stops] "Go ahead."
```

---

## Voice Selection

### Options

1. **Stock voices** — Use provider library (fast start)
2. **Voice cloning** — Clone brand spokesperson
3. **Custom training** — Train on brand audio

### Considerations

- **Gender** — Match brand expectations
- **Accent** — Regional or neutral
- **Energy** — Upbeat vs. calm
- **Speaking rate** — Fast = efficient, slow = caring
- **Age** — Youthful vs. authoritative

Define in `brand.md`:

```markdown
## Voice
- Use: ElevenLabs "Emily" (warm, professional)
- Rate: Slightly slower than default (0.9x)
- Energy: Calm but engaged
```

---

## Cost Modeling

### Per-Call Breakdown

Assuming 5-minute average call:

| Component | Cost per Call |
|-----------|---------------|
| Telephony (Twilio) | $0.05 |
| ASR (Deepgram) | $0.02 |
| LLM (Claude) | $0.10-0.30 |
| TTS (ElevenLabs) | $0.30 |
| **Total** | **~$0.50-0.70** |

### Cost Optimization

- Use Deepgram Aura-2 for TTS → $0.015 vs $0.30
- Cache common responses (greetings, closings)
- Shorter LLM context = lower cost
- Batch mode for non-urgent (voicemail, email)

---

## Implementation Phases

### Phase 1: Text Foundation (Current)

- [x] Context injection via markdown
- [x] Customer memory persistence
- [x] Dashboard + insights

### Phase 2: Voice PoC

- [ ] Twilio webhook integration
- [ ] Deepgram streaming ASR
- [ ] ElevenLabs streaming TTS
- [ ] End-to-end voice call

### Phase 3: Production

- [ ] Latency optimization
- [ ] Interruption handling
- [ ] Multi-turn context management
- [ ] Human escalation handoff

### Phase 4: Scale

- [ ] Call queuing
- [ ] Concurrent call handling
- [ ] Regional deployment (latency)
- [ ] Analytics + call recordings

---

## References

- [Deepgram Docs](https://developers.deepgram.com/)
- [ElevenLabs Docs](https://docs.elevenlabs.io/)
- [Twilio Voice](https://www.twilio.com/docs/voice)
- [OpenAI Audio](https://platform.openai.com/docs/guides/audio)
