/**
 * DCT Tracking for Concierge
 * 
 * Delegation chain tracking - who authorized what.
 */

import { DCT } from '@substr8/dct';

interface Delegation {
  id: string;
  delegator: {
    type: 'policy' | 'role' | 'human' | 'agent';
    id: string;
    name?: string;
  };
  delegatee: {
    type: 'role' | 'agent';
    id: string;
  };
  capability: string;
  constraints: Record<string, unknown>;
  validFrom: string;
  validUntil?: string;
}

interface Action {
  id: string;
  timestamp: string;
  agent: string;
  action: {
    type: 'tool_call' | 'file_write' | 'escalation';
    tool?: string;
    path?: string;
    params?: Record<string, unknown>;
  };
  delegationChain: string[];  // List of delegation IDs
  conversation: {
    id: string;
    customerId: string;
    turnIndex: number;
  };
}

interface DCTConfig {
  storage: 'memory' | 'postgres';
}

export class ConciergeTracking {
  private dct: DCT;
  
  constructor(config: DCTConfig) {
    this.dct = new DCT(config);
  }
  
  /**
   * Record a delegation
   */
  async delegate(delegation: Omit<Delegation, 'id'>): Promise<Delegation> {
    return this.dct.delegate(delegation);
  }
  
  /**
   * Record an action with its delegation chain
   */
  async recordAction(
    agentId: string,
    action: Action['action'],
    conversation: Action['conversation']
  ): Promise<Action> {
    // Resolve the delegation chain
    const chain = await this.dct.resolveChain({
      agent: agentId,
      capability: action.type === 'tool_call' ? `use:tool:${action.tool}` : `${action.type}`
    });
    
    return this.dct.recordAction({
      agent: agentId,
      action,
      delegationChain: chain.ids,
      conversation
    });
  }
  
  /**
   * Get full chain for an action
   */
  async getActionChain(actionId: string): Promise<{ action: Action; delegations: Delegation[] }> {
    const action = await this.dct.getAction(actionId);
    const delegations = await Promise.all(
      action.delegationChain.map(id => this.dct.getDelegation(id))
    );
    return { action, delegations };
  }
  
  /**
   * Query actions by customer
   */
  async queryByCustomer(customerId: string, options?: { after?: string; before?: string }): Promise<Action[]> {
    return this.dct.queryActions({
      'conversation.customerId': customerId,
      ...options
    });
  }
  
  /**
   * Record escalation to human
   */
  async recordEscalation(
    agentId: string,
    reason: string,
    conversation: Action['conversation']
  ): Promise<Action> {
    return this.recordAction(
      agentId,
      {
        type: 'escalation',
        params: { reason }
      },
      conversation
    );
  }
}

/**
 * Standard delegation templates
 */
export function createPolicyDelegations(): Omit<Delegation, 'id'>[] {
  return [
    // Company policy -> Support role
    {
      delegator: { type: 'policy', id: 'refund_policy_v2', name: 'Support Refund Policy' },
      delegatee: { type: 'role', id: 'support_agent' },
      capability: 'use:tool:initiate_refund',
      constraints: { maxAmount: 100, requiresReason: true },
      validFrom: new Date().toISOString()
    },
    // Company policy -> Retention role
    {
      delegator: { type: 'policy', id: 'retention_policy_v1', name: 'Retention Authority' },
      delegatee: { type: 'role', id: 'retention_agent' },
      capability: 'use:tool:cancel_subscription',
      constraints: {},
      validFrom: new Date().toISOString()
    }
  ];
}
