/**
 * GAM (Git-Native Agent Memory) for Concierge
 * 
 * Uses Git as the storage layer for customer memory.
 */

import { GAM } from '@substr8/gam';

interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  signature?: {
    valid: boolean;
    keyId: string;
  };
}

interface GAMConfig {
  repoPath: string;
  signingKey?: string;
  remote?: string;
}

export class ConciergeMemory {
  private gam: GAM;
  private agentId: string;
  
  constructor(config: GAMConfig, agentId: string) {
    this.gam = new GAM(config);
    this.agentId = agentId;
  }
  
  /**
   * Initialize or open the memory repository
   */
  async init(): Promise<void> {
    await this.gam.init();
  }
  
  /**
   * Record an interaction in customer memory
   */
  async recordInteraction(
    customerId: string,
    interaction: {
      summary: string;
      type: string;
      timestamp: string;
      content: string;
    }
  ): Promise<Commit> {
    const memoryPath = `customers/${customerId}/memory.md`;
    
    // Read existing memory
    let existing = '';
    try {
      existing = await this.gam.read(memoryPath);
    } catch {
      // File doesn't exist yet
      existing = `# Interaction Memory: Customer ${customerId}\n`;
    }
    
    // Append new interaction
    const entry = this.formatInteraction(interaction);
    const updated = existing + '\n' + entry;
    
    // Commit with metadata
    return this.gam.commit({
      files: [{ path: memoryPath, content: updated }],
      message: `[memory] Customer ${customerId}: ${interaction.summary}`,
      author: this.agentId,
      sign: true,
      metadata: {
        customerId,
        interactionType: interaction.type,
        timestamp: interaction.timestamp
      }
    });
  }
  
  /**
   * Update customer profile
   */
  async updateProfile(
    customerId: string,
    updates: Record<string, unknown>
  ): Promise<Commit> {
    const profilePath = `customers/${customerId}/customer.md`;
    
    // Read existing
    let existing = await this.gam.read(profilePath);
    
    // Apply updates (simple key-value for now)
    const updated = this.applyProfileUpdates(existing, updates);
    
    return this.gam.commit({
      files: [{ path: profilePath, content: updated }],
      message: `[profile] Customer ${customerId}: Updated ${Object.keys(updates).join(', ')}`,
      author: this.agentId,
      sign: true
    });
  }
  
  /**
   * Get customer memory history
   */
  async getHistory(customerId: string, limit = 50): Promise<Commit[]> {
    return this.gam.log({
      path: `customers/${customerId}/`,
      limit
    });
  }
  
  /**
   * Get memory state at a specific point in time
   */
  async atTime(customerId: string, timestamp: string): Promise<string> {
    return this.gam.at({
      path: `customers/${customerId}/memory.md`,
      ref: timestamp
    });
  }
  
  /**
   * Verify signature on a commit
   */
  async verify(commitHash: string): Promise<{ valid: boolean; signer: string }> {
    const commit = await this.gam.getCommit(commitHash);
    return {
      valid: commit.signature?.valid ?? false,
      signer: commit.signature?.keyId ?? 'unsigned'
    };
  }
  
  /**
   * Sync with remote
   */
  async sync(): Promise<void> {
    await this.gam.pull();
    await this.gam.push();
  }
  
  private formatInteraction(interaction: {
    summary: string;
    type: string;
    timestamp: string;
    content: string;
  }): string {
    const date = interaction.timestamp.split('T')[0];
    return `## ${date} — ${interaction.type}
${interaction.content}
`;
  }
  
  private applyProfileUpdates(existing: string, updates: Record<string, unknown>): string {
    // Simple implementation - in practice would parse markdown properly
    let updated = existing;
    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^- ${key}:.*$`, 'm');
      if (regex.test(updated)) {
        updated = updated.replace(regex, `- ${key}: ${value}`);
      }
    }
    return updated;
  }
}

/**
 * Bootstrap a new customer
 */
export async function bootstrapCustomer(
  memory: ConciergeMemory,
  customerId: string,
  initialProfile: Record<string, unknown>
): Promise<void> {
  const profileContent = `# Customer: ${customerId}

## Account
${Object.entries(initialProfile).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Communication Preferences
- Primary: Unknown
- Style: Unknown

## Notes
- New customer
`;

  const memoryContent = `# Interaction Memory: ${customerId}
`;

  await memory['gam'].commit({
    files: [
      { path: `customers/${customerId}/customer.md`, content: profileContent },
      { path: `customers/${customerId}/memory.md`, content: memoryContent }
    ],
    message: `[bootstrap] New customer: ${customerId}`,
    author: memory['agentId'],
    sign: true
  });
}
