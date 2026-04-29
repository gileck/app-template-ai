import type { ObjectId } from 'mongodb';

export type LoginApprovalStatus = 'pending' | 'approved';

export interface LoginApproval {
  _id: ObjectId;
  userId: ObjectId;
  username: string;
  browserToken: string;
  status: LoginApprovalStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  approvedAt?: Date;
  approvedByChatId?: string;
}

export type LoginApprovalCreate = Omit<LoginApproval, '_id' | 'approvedAt' | 'approvedByChatId'>;
