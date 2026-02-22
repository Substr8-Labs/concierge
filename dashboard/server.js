const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;
const WORKSPACE = process.env.WORKSPACE || '/workspace';
const JAEGER_URL = process.env.JAEGER_URL || 'http://host.docker.internal:16686';

// Serve static dashboard
app.use(express.static(path.join(__dirname, 'public')));

// API: List all customers
app.get('/api/customers', async (req, res) => {
  try {
    const customersDir = path.join(WORKSPACE, 'customers');
    const entries = await fs.readdir(customersDir, { withFileTypes: true });
    const customers = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const customerPath = path.join(customersDir, entry.name);
        let profile = null;
        let memoryCount = 0;
        
        try {
          const customerMd = await fs.readFile(path.join(customerPath, 'customer.md'), 'utf-8');
          // Extract name from first heading
          const nameMatch = customerMd.match(/^#\s*Customer:\s*(.+)$/m);
          profile = {
            id: entry.name,
            name: nameMatch ? nameMatch[1].trim() : entry.name,
            raw: customerMd
          };
          
          // Count memory entries
          const memoryMd = await fs.readFile(path.join(customerPath, 'memory.md'), 'utf-8');
          memoryCount = (memoryMd.match(/^##\s+\d{4}-\d{2}-\d{2}/gm) || []).length;
        } catch (e) {
          // Files might not exist yet
        }
        
        customers.push({
          id: entry.name,
          name: profile?.name || entry.name,
          interactions: memoryCount
        });
      }
    }
    
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get customer details
app.get('/api/customers/:id', async (req, res) => {
  try {
    const customerPath = path.join(WORKSPACE, 'customers', req.params.id);
    
    let customer = null;
    let memory = [];
    
    // Read customer.md
    try {
      const customerMd = await fs.readFile(path.join(customerPath, 'customer.md'), 'utf-8');
      customer = parseCustomerMd(customerMd);
    } catch (e) {
      customer = { id: req.params.id, name: req.params.id };
    }
    
    // Read memory.md
    try {
      const memoryMd = await fs.readFile(path.join(customerPath, 'memory.md'), 'utf-8');
      memory = parseMemoryMd(memoryMd);
    } catch (e) {
      memory = [];
    }
    
    res.json({ customer, memory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get raw files
app.get('/api/customers/:id/raw', async (req, res) => {
  try {
    const customerPath = path.join(WORKSPACE, 'customers', req.params.id);
    
    let customerMd = '';
    let memoryMd = '';
    
    try {
      customerMd = await fs.readFile(path.join(customerPath, 'customer.md'), 'utf-8');
    } catch (e) {}
    
    try {
      memoryMd = await fs.readFile(path.join(customerPath, 'memory.md'), 'utf-8');
    } catch (e) {}
    
    res.json({ customerMd, memoryMd });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Parse customer.md into structured data
function parseCustomerMd(md) {
  const data = { raw: md, preferences: {} };
  
  // Extract name
  const nameMatch = md.match(/^#\s*Customer:\s*(.+)$/m);
  if (nameMatch) data.name = nameMatch[1].trim();
  
  // Extract fields from ## Account section
  const accountMatch = md.match(/## Account\n([\s\S]*?)(?=\n##|$)/);
  if (accountMatch) {
    const lines = accountMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*\*\*?(.+?)\*\*?:\s*(.+)$/);
      if (match) {
        const key = match[1].toLowerCase().replace(/\s+/g, '_');
        data[key] = match[2].trim();
      }
      // Also match without bold
      const match2 = line.match(/^-\s*([^:]+):\s*(.+)$/);
      if (match2 && !match) {
        const key = match2[1].trim().toLowerCase().replace(/\s+/g, '_');
        data[key] = match2[2].trim();
      }
    }
  }
  
  // Extract Communication Preferences
  const prefsMatch = md.match(/## Communication Preferences\n([\s\S]*?)(?=\n##|$)/);
  if (prefsMatch) {
    const lines = prefsMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
        // Extract just the value before any "—" explanation
        const value = match[2].split('—')[0].trim();
        data.preferences[key] = value;
      }
    }
  }
  
  // Extract Voice Preferences
  const voiceMatch = md.match(/## Voice Preferences[^\n]*\n([\s\S]*?)(?=\n##|$)/);
  if (voiceMatch) {
    const lines = voiceMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^-\s*([^:]+):\s*(.+)$/);
      if (match) {
        data.preferences['voice_' + match[1].trim().toLowerCase()] = match[2].trim();
      }
    }
  }
  
  return data;
}

// Parse memory.md into timeline entries
function parseMemoryMd(md) {
  const entries = [];
  const sections = md.split(/(?=^## \d{4}-\d{2}-\d{2})/m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const headerMatch = section.match(/^## (\d{4}-\d{2}-\d{2})\s*(?:—|-)?\s*(.*)$/m);
    if (headerMatch) {
      const entry = {
        date: headerMatch[1],
        title: headerMatch[2].trim(),
        content: section.replace(/^## .+\n/, '').trim()
      };
      
      // Extract key fields
      const reasonMatch = section.match(/\*\*Reason\*\*:\s*(.+)$/m);
      const resolutionMatch = section.match(/\*\*Resolution\*\*:\s*(.+)$/m);
      const moodMatch = section.match(/\*\*Mood\*\*:\s*(.+)$/m);
      
      if (reasonMatch) entry.reason = reasonMatch[1];
      if (resolutionMatch) entry.resolution = resolutionMatch[1];
      if (moodMatch) entry.mood = moodMatch[1];
      
      entries.push(entry);
    }
  }
  
  return entries.reverse(); // Most recent first
}

// API: Get customer insights (derived from memory)
app.get('/api/customers/:id/insights', async (req, res) => {
  try {
    const customerPath = path.join(WORKSPACE, 'customers', req.params.id);
    
    let memoryMd = '';
    let customerMd = '';
    
    try {
      memoryMd = await fs.readFile(path.join(customerPath, 'memory.md'), 'utf-8');
      customerMd = await fs.readFile(path.join(customerPath, 'customer.md'), 'utf-8');
    } catch (e) {}
    
    const insights = analyzeCustomer(customerMd, memoryMd);
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze customer data for insights
function analyzeCustomer(customerMd, memoryMd) {
  const insights = {
    healthScore: 0,
    churnRisk: 'low',
    upsellPotential: 'low',
    sentimentTrend: 'stable',
    signals: [],
    suggestedActions: [],
    mentionedTopics: [],
    interactionStats: {
      total: 0,
      lastContact: null,
      avgMood: 'neutral'
    }
  };
  
  if (!memoryMd) return insights;
  
  // Parse interactions
  const interactions = [];
  const sections = memoryMd.split(/(?=^## \d{4}-\d{2}-\d{2})/m);
  
  for (const section of sections) {
    if (!section.trim()) continue;
    
    const dateMatch = section.match(/^## (\d{4}-\d{2}-\d{2})/m);
    if (dateMatch) {
      const mood = extractMood(section);
      const topics = extractTopics(section);
      
      interactions.push({
        date: dateMatch[1],
        mood,
        topics,
        text: section
      });
    }
  }
  
  insights.interactionStats.total = interactions.length;
  
  if (interactions.length === 0) return insights;
  
  // Last contact
  insights.interactionStats.lastContact = interactions[0]?.date;
  
  // Sentiment analysis
  const moods = interactions.map(i => i.mood).filter(Boolean);
  const moodScores = moods.map(m => {
    if (m.includes('happy') || m.includes('satisfied')) return 1;
    if (m.includes('frustrat') || m.includes('angry') || m.includes('upset')) return -1;
    return 0;
  });
  
  const avgMoodScore = moodScores.length > 0 
    ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length 
    : 0;
  
  insights.interactionStats.avgMood = avgMoodScore > 0.3 ? 'positive' 
    : avgMoodScore < -0.3 ? 'negative' : 'neutral';
  
  // Sentiment trend (compare recent vs older)
  if (moodScores.length >= 2) {
    const recent = moodScores.slice(0, Math.ceil(moodScores.length / 2));
    const older = moodScores.slice(Math.ceil(moodScores.length / 2));
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    if (recentAvg > olderAvg + 0.3) insights.sentimentTrend = 'improving';
    else if (recentAvg < olderAvg - 0.3) insights.sentimentTrend = 'declining';
    else insights.sentimentTrend = 'stable';
  }
  
  // Collect all topics
  const allTopics = interactions.flatMap(i => i.topics);
  const topicCounts = {};
  for (const topic of allTopics) {
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  }
  insights.mentionedTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, count]) => ({ topic, count }));
  
  // Churn signals
  const churnSignals = [];
  const fullText = memoryMd.toLowerCase();
  
  if (fullText.includes('cancel') || fullText.includes('cancellation')) {
    churnSignals.push('Mentioned cancellation');
  }
  if (fullText.includes('competitor') || fullText.includes('alternative') || fullText.includes('switch')) {
    churnSignals.push('Mentioned competitors/alternatives');
  }
  if (moodScores.filter(m => m < 0).length >= 2) {
    churnSignals.push('Multiple frustrated interactions');
  }
  if (fullText.includes('expensive') || fullText.includes('cost') || fullText.includes('price')) {
    churnSignals.push('Price sensitivity mentioned');
  }
  
  // Upsell signals
  const upsellSignals = [];
  
  if (fullText.includes('team') || fullText.includes('grow') || fullText.includes('scale')) {
    upsellSignals.push('Team growth mentioned');
  }
  if (fullText.includes('enterprise') || fullText.includes('upgrade')) {
    upsellSignals.push('Asked about enterprise/upgrade');
  }
  if (fullText.includes('limit') || fullText.includes('more users') || fullText.includes('more seats')) {
    upsellSignals.push('Hitting plan limits');
  }
  if (fullText.includes('feature') && (fullText.includes('need') || fullText.includes('want') || fullText.includes('wish'))) {
    upsellSignals.push('Feature requests indicate engagement');
  }
  
  // Calculate scores
  insights.churnRisk = churnSignals.length >= 2 ? 'high' 
    : churnSignals.length === 1 ? 'medium' : 'low';
  
  insights.upsellPotential = upsellSignals.length >= 2 ? 'high'
    : upsellSignals.length === 1 ? 'medium' : 'low';
  
  // Health score (0-100)
  let healthScore = 70; // Base
  healthScore += avgMoodScore * 15; // Mood impact
  healthScore -= churnSignals.length * 10; // Churn signals
  healthScore += upsellSignals.length * 5; // Engagement signals
  if (insights.sentimentTrend === 'improving') healthScore += 10;
  if (insights.sentimentTrend === 'declining') healthScore -= 15;
  insights.healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));
  
  // Compile signals
  insights.signals = [
    ...churnSignals.map(s => ({ type: 'churn', text: s })),
    ...upsellSignals.map(s => ({ type: 'upsell', text: s }))
  ];
  
  // Suggested actions
  if (insights.churnRisk === 'high') {
    insights.suggestedActions.push({
      priority: 'high',
      action: 'Schedule retention call',
      reason: 'Multiple churn signals detected'
    });
  }
  if (insights.sentimentTrend === 'declining') {
    insights.suggestedActions.push({
      priority: 'high',
      action: 'Proactive check-in',
      reason: 'Sentiment trending negative'
    });
  }
  if (insights.upsellPotential === 'high') {
    insights.suggestedActions.push({
      priority: 'medium',
      action: 'Schedule expansion conversation',
      reason: 'Strong upsell signals'
    });
  }
  if (insights.interactionStats.total === 1) {
    insights.suggestedActions.push({
      priority: 'low',
      action: 'Follow-up on first interaction',
      reason: 'New customer - ensure satisfaction'
    });
  }
  
  return insights;
}

function extractMood(text) {
  const moodMatch = text.match(/\*\*Mood\*\*:\s*(.+)$/m);
  return moodMatch ? moodMatch[1].toLowerCase() : '';
}

function extractTopics(text) {
  const topics = [];
  const lowerText = text.toLowerCase();
  
  // Product/feature mentions
  const productKeywords = ['billing', 'payment', 'login', 'password', 'account', 'order', 
    'shipping', 'refund', 'subscription', 'plan', 'feature', 'bug', 'error', 'issue',
    'integration', 'api', 'support', 'help', 'pricing', 'upgrade', 'downgrade'];
  
  for (const keyword of productKeywords) {
    if (lowerText.includes(keyword)) {
      topics.push(keyword);
    }
  }
  
  return [...new Set(topics)]; // Dedupe
}

// ============ TELEMETRY ENDPOINTS ============

// Helper to fetch from Jaeger
async function fetchJaeger(path) {
  return new Promise((resolve, reject) => {
    const url = `${JAEGER_URL}${path}`;
    http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'parse error', raw: data });
        }
      });
    }).on('error', (e) => {
      resolve({ error: e.message });
    });
  });
}

// API: Get telemetry overview
app.get('/api/telemetry', async (req, res) => {
  try {
    const [services, recentTraces] = await Promise.all([
      fetchJaeger('/api/services'),
      fetchJaeger('/api/traces?service=fdaa-proxy&limit=50')
    ]);
    
    // Process traces into stats
    const stats = {
      services: services.data || [],
      totalTraces: 0,
      operations: {},
      recentActivity: [],
      avgDuration: 0,
      errorCount: 0
    };
    
    if (recentTraces.data) {
      stats.totalTraces = recentTraces.data.length;
      
      let totalDuration = 0;
      
      for (const trace of recentTraces.data) {
        for (const span of trace.spans || []) {
          const op = span.operationName;
          stats.operations[op] = (stats.operations[op] || 0) + 1;
          totalDuration += span.duration || 0;
          
          // Check for errors
          const errorTag = (span.tags || []).find(t => t.key === 'error');
          if (errorTag && errorTag.value === true) {
            stats.errorCount++;
          }
        }
        
        // Get first span for recent activity
        if (trace.spans && trace.spans[0]) {
          const span = trace.spans[0];
          stats.recentActivity.push({
            operation: span.operationName,
            duration: span.duration,
            time: new Date(span.startTime / 1000).toISOString(),
            traceId: trace.traceID
          });
        }
      }
      
      const totalSpans = Object.values(stats.operations).reduce((a, b) => a + b, 0);
      stats.avgDuration = totalSpans > 0 ? Math.round(totalDuration / totalSpans / 1000) : 0; // ms
    }
    
    // Sort recent activity by time
    stats.recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    stats.recentActivity = stats.recentActivity.slice(0, 20);
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Get specific traces for an operation
app.get('/api/telemetry/traces/:operation', async (req, res) => {
  try {
    const operation = req.params.operation;
    const traces = await fetchJaeger(`/api/traces?service=fdaa-proxy&operation=${encodeURIComponent(operation)}&limit=20`);
    
    const processed = (traces.data || []).map(trace => {
      const span = trace.spans?.[0] || {};
      return {
        traceId: trace.traceID,
        operation: span.operationName,
        duration: span.duration,
        time: new Date(span.startTime / 1000).toISOString(),
        tags: (span.tags || []).reduce((acc, t) => { acc[t.key] = t.value; return acc; }, {})
      };
    });
    
    res.json(processed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Platform stats (mock for now, will connect to real endpoints)
app.get('/api/telemetry/platform', async (req, res) => {
  // This will connect to FDAA/ACC/DCT endpoints when available
  res.json({
    fdaa: {
      snapshots: 0,
      verifications: 0,
      hashChains: 0
    },
    acc: {
      tokensIssued: 0,
      permissionChecks: 0,
      denials: 0
    },
    dct: {
      delegations: 0,
      validations: 0,
      revocations: 0
    },
    note: "Connect to real endpoints when FDAA/ACC/DCT services are integrated"
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running at http://0.0.0.0:${PORT}`);
  console.log(`Workspace: ${WORKSPACE}`);
  console.log(`Jaeger: ${JAEGER_URL}`);
});
