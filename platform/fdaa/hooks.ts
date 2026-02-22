/**
 * FDAA Hooks for Concierge
 * 
 * Cryptographic file versioning integration.
 * Every customer file change gets hash-chained.
 */

import { FDAA } from '@substr8/fdaa';

interface FDAAConfig {
  storage: 'sqlite' | 'postgres' | 'memory';
  storagePath?: string;
  signingKey?: string;
}

interface SnapshotResult {
  version: number;
  hash: string;
  parentHash: string | null;
  timestamp: string;
  actor: string;
}

export class ConciergeFileHooks {
  private fdaa: FDAA;
  private agentId: string;
  
  constructor(config: FDAAConfig, agentId: string) {
    this.fdaa = new FDAA(config);
    this.agentId = agentId;
  }
  
  /**
   * Record a file write in FDAA
   */
  async onFileWrite(path: string, content: string, metadata?: Record<string, unknown>): Promise<SnapshotResult> {
    return this.fdaa.snapshot({
      path,
      content,
      actor: this.agentId,
      metadata: {
        ...metadata,
        source: 'concierge'
      }
    });
  }
  
  /**
   * Verify a file version
   */
  async verify(path: string, version?: number): Promise<{ valid: boolean; details: SnapshotResult }> {
    return this.fdaa.verify({ path, version });
  }
  
  /**
   * Get file state at a specific time
   */
  async atTime(path: string, timestamp: string): Promise<{ content: string; version: SnapshotResult }> {
    return this.fdaa.at({ path, timestamp });
  }
  
  /**
   * Get full history of a file
   */
  async history(path: string, limit = 50): Promise<SnapshotResult[]> {
    return this.fdaa.history({ path, limit });
  }
  
  /**
   * Verify entire chain integrity
   */
  async verifyChain(path: string): Promise<{ valid: boolean; breaks: string[] }> {
    return this.fdaa.verifyChain({ path });
  }
}

/**
 * Middleware for automatic FDAA tracking
 */
export function fdaaMiddleware(hooks: ConciergeFileHooks) {
  return {
    async beforeWrite(path: string, content: string) {
      // Could add pre-write validation here
      return { proceed: true };
    },
    
    async afterWrite(path: string, content: string, metadata?: Record<string, unknown>) {
      return hooks.onFileWrite(path, content, metadata);
    }
  };
}
