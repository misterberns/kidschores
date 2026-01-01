import { APIRequestContext } from '@playwright/test';
import { KidInput, ChoreInput, RewardInput, ParentInput, Kid, Chore, Reward, Parent } from './test-data';

/**
 * API helper functions for test setup and assertions
 */
export class ApiHelpers {
  constructor(private apiContext: APIRequestContext) {}

  // ============== Kids API ==============

  async createKid(data: KidInput): Promise<Kid> {
    const response = await this.apiContext.post('/api/kids', { data });
    if (!response.ok()) {
      throw new Error(`Failed to create kid: ${await response.text()}`);
    }
    return response.json();
  }

  async getKid(id: string): Promise<Kid> {
    const response = await this.apiContext.get(`/api/kids/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to get kid: ${await response.text()}`);
    }
    return response.json();
  }

  async listKids(): Promise<Kid[]> {
    const response = await this.apiContext.get('/api/kids');
    if (!response.ok()) {
      throw new Error(`Failed to list kids: ${await response.text()}`);
    }
    return response.json();
  }

  async updateKid(id: string, data: Partial<KidInput>): Promise<Kid> {
    const response = await this.apiContext.put(`/api/kids/${id}`, { data });
    if (!response.ok()) {
      throw new Error(`Failed to update kid: ${await response.text()}`);
    }
    return response.json();
  }

  async deleteKid(id: string): Promise<void> {
    const response = await this.apiContext.delete(`/api/kids/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to delete kid: ${await response.text()}`);
    }
  }

  async adjustKidPoints(id: string, points: number, reason?: string): Promise<Kid> {
    const response = await this.apiContext.post(`/api/kids/${id}/points`, {
      data: { points, reason },
    });
    if (!response.ok()) {
      throw new Error(`Failed to adjust points: ${await response.text()}`);
    }
    return response.json();
  }

  // ============== Chores API ==============

  async createChore(data: ChoreInput): Promise<Chore> {
    const response = await this.apiContext.post('/api/chores', { data });
    if (!response.ok()) {
      throw new Error(`Failed to create chore: ${await response.text()}`);
    }
    return response.json();
  }

  async getChore(id: string): Promise<Chore> {
    const response = await this.apiContext.get(`/api/chores/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to get chore: ${await response.text()}`);
    }
    return response.json();
  }

  async listChores(): Promise<Chore[]> {
    const response = await this.apiContext.get('/api/chores');
    if (!response.ok()) {
      throw new Error(`Failed to list chores: ${await response.text()}`);
    }
    return response.json();
  }

  async claimChore(choreId: string, kidId: string): Promise<any> {
    const response = await this.apiContext.post(`/api/chores/${choreId}/claim`, {
      data: { kid_id: kidId },
    });
    if (!response.ok()) {
      throw new Error(`Failed to claim chore: ${await response.text()}`);
    }
    return response.json();
  }

  async approveChore(choreId: string, parentName: string, pointsAwarded?: number): Promise<any> {
    const response = await this.apiContext.post(`/api/chores/${choreId}/approve`, {
      data: { parent_name: parentName, points_awarded: pointsAwarded },
    });
    if (!response.ok()) {
      throw new Error(`Failed to approve chore: ${await response.text()}`);
    }
    return response.json();
  }

  async disapproveChore(choreId: string, parentName: string): Promise<any> {
    const response = await this.apiContext.post(`/api/chores/${choreId}/disapprove`, {
      data: { parent_name: parentName },
    });
    if (!response.ok()) {
      throw new Error(`Failed to disapprove chore: ${await response.text()}`);
    }
    return response.json();
  }

  // ============== Rewards API ==============

  async createReward(data: RewardInput): Promise<Reward> {
    const response = await this.apiContext.post('/api/rewards', { data });
    if (!response.ok()) {
      throw new Error(`Failed to create reward: ${await response.text()}`);
    }
    return response.json();
  }

  async getReward(id: string): Promise<Reward> {
    const response = await this.apiContext.get(`/api/rewards/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to get reward: ${await response.text()}`);
    }
    return response.json();
  }

  async listRewards(): Promise<Reward[]> {
    const response = await this.apiContext.get('/api/rewards');
    if (!response.ok()) {
      throw new Error(`Failed to list rewards: ${await response.text()}`);
    }
    return response.json();
  }

  async redeemReward(rewardId: string, kidId: string): Promise<any> {
    const response = await this.apiContext.post(`/api/rewards/${rewardId}/redeem`, {
      data: { kid_id: kidId },
    });
    if (!response.ok()) {
      throw new Error(`Failed to redeem reward: ${await response.text()}`);
    }
    return response.json();
  }

  async approveReward(rewardId: string, parentName: string): Promise<any> {
    const response = await this.apiContext.post(`/api/rewards/${rewardId}/approve`, {
      data: { parent_name: parentName },
    });
    if (!response.ok()) {
      throw new Error(`Failed to approve reward: ${await response.text()}`);
    }
    return response.json();
  }

  // ============== Parents API ==============

  async createParent(data: ParentInput): Promise<Parent> {
    const response = await this.apiContext.post('/api/parents', { data });
    if (!response.ok()) {
      throw new Error(`Failed to create parent: ${await response.text()}`);
    }
    return response.json();
  }

  async getParent(id: string): Promise<Parent> {
    const response = await this.apiContext.get(`/api/parents/${id}`);
    if (!response.ok()) {
      throw new Error(`Failed to get parent: ${await response.text()}`);
    }
    return response.json();
  }

  async listParents(): Promise<Parent[]> {
    const response = await this.apiContext.get('/api/parents');
    if (!response.ok()) {
      throw new Error(`Failed to list parents: ${await response.text()}`);
    }
    return response.json();
  }

  async verifyParentPin(id: string, pin: string): Promise<{ valid: boolean }> {
    const response = await this.apiContext.post(`/api/parents/${id}/verify-pin`, {
      data: { pin },
    });
    if (!response.ok()) {
      throw new Error(`Failed to verify PIN: ${await response.text()}`);
    }
    return response.json();
  }

  // ============== Approvals API ==============

  async getPendingApprovals(): Promise<{ chores: any[]; rewards: any[] }> {
    const response = await this.apiContext.get('/api/approvals/pending');
    if (!response.ok()) {
      throw new Error(`Failed to get pending approvals: ${await response.text()}`);
    }
    return response.json();
  }

  async getPendingCount(): Promise<{ total: number }> {
    const response = await this.apiContext.get('/api/approvals/pending/count');
    if (!response.ok()) {
      throw new Error(`Failed to get pending count: ${await response.text()}`);
    }
    return response.json();
  }

  async getApprovalHistory(limit = 50): Promise<any[]> {
    const response = await this.apiContext.get(`/api/approvals/history?limit=${limit}`);
    if (!response.ok()) {
      throw new Error(`Failed to get approval history: ${await response.text()}`);
    }
    return response.json();
  }
}
