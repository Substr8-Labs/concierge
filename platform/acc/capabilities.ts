/**
 * ACC Capabilities for Concierge
 * 
 * Defines what agents can do per conversation.
 */

import { ACC } from '@substr8/acc';

interface CapabilityToken {
  id: string;
  agent: string;
  issued: string;
  expires: string;
  capabilities: string[];
  constraints: {
    maxToolCalls?: number;
    maxWriteBytes?: number;
    requireApproval?: string[];
  };
  context: {
    conversationId: string;
    customerId: string;
  };
}

interface ACCConfig {
  storage: 'memory' | 'redis' | 'postgres';
  ttlDefault: string;
}

export class ConciergeCaps {
  private acc: ACC;
  
  constructor(config: ACCConfig) {
    this.acc = new ACC(config);
  }
  
  /**
   * Issue capability token for a conversation
   */
  async issueToken(
    agentId: string,
    customerId: string,
    conversationId: string,
    role: 'support' | 'sales' | 'retention'
  ): Promise<CapabilityToken> {
    const capabilities = this.getCapabilitiesForRole(role, customerId);
    const constraints = this.getConstraintsForRole(role);
    
    return this.acc.issue({
      agent: agentId,
      ttl: '1h',
      capabilities,
      constraints,
      context: { conversationId, customerId }
    });
  }
  
  /**
   * Check if action is allowed
   */
  async check(token: CapabilityToken, capability: string): Promise<boolean> {
    return this.acc.check(token, capability);
  }
  
  /**
   * Check if action requires approval
   */
  requiresApproval(token: CapabilityToken, action: string): boolean {
    return token.constraints.requireApproval?.includes(action) ?? false;
  }
  
  /**
   * Revoke token (end of conversation)
   */
  async revoke(tokenId: string): Promise<void> {
    return this.acc.revoke(tokenId);
  }
  
  private getCapabilitiesForRole(role: string, customerId: string): string[] {
    const base = [
      `read:customer:${customerId}`,
      `read:memory:${customerId}`,
      `write:memory:${customerId}`
    ];
    
    switch (role) {
      case 'support':
        return [
          ...base,
          'use:tool:check_order_status',
          'use:tool:create_ticket',
          'use:tool:schedule_callback',
          'use:tool:initiate_refund'
        ];
      case 'sales':
        return [
          ...base,
          'use:tool:create_quote',
          'use:tool:schedule_demo',
          'use:tool:get_pricing'
        ];
      case 'retention':
        return [
          ...base,
          'use:tool:apply_retention_offer',
          'use:tool:cancel_subscription',
          'use:tool:initiate_refund'
        ];
      default:
        return base;
    }
  }
  
  private getConstraintsForRole(role: string) {
    switch (role) {
      case 'support':
        return {
          maxToolCalls: 20,
          maxWriteBytes: 10000,
          requireApproval: ['initiate_refund']
        };
      case 'sales':
        return {
          maxToolCalls: 15,
          requireApproval: ['apply_discount']
        };
      case 'retention':
        return {
          maxToolCalls: 25,
          requireApproval: []  // More autonomy
        };
      default:
        return { maxToolCalls: 10 };
    }
  }
}

/**
 * Role definitions for Concierge agents
 */
export const ROLES = {
  support: {
    description: 'Customer support agent',
    defaultCapabilities: [
      'read:customer:*',
      'write:memory:*',
      'use:tool:check_order_status',
      'use:tool:create_ticket'
    ]
  },
  sales: {
    description: 'Sales agent',
    defaultCapabilities: [
      'read:customer:*',
      'write:memory:*',
      'use:tool:create_quote',
      'use:tool:schedule_demo'
    ]
  },
  retention: {
    description: 'Retention specialist',
    defaultCapabilities: [
      'read:customer:*',
      'write:memory:*',
      'use:tool:apply_retention_offer'
    ]
  }
} as const;
