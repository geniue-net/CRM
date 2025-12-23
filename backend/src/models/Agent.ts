import mongoose, { Schema, Document } from 'mongoose';

export interface IAgent extends Document {
  id: string;
  user_id: string;
  name: string;
  status: string;
  last_heartbeat_at?: Date;
  allowed_ip?: string;
  token?: string;
  token_hash?: string;
  // Meta account connection info
  meta_connected?: boolean;
  meta_account_name?: string;
  meta_account_id?: string;
  meta_connected_at?: Date;
  meta_last_synced_at?: Date;
  meta_account_status?: string; // 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'
}

const AgentSchema = new Schema<IAgent>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  status: { type: String, default: 'OFFLINE', required: true },
  last_heartbeat_at: { type: Date },
  allowed_ip: { type: String },
  token: { type: String },
  token_hash: { type: String },
  // Meta account connection info
  meta_connected: { type: Boolean, default: false },
  meta_account_name: { type: String },
  meta_account_id: { type: String },
  meta_connected_at: { type: Date },
  meta_last_synced_at: { type: Date },
  meta_account_status: { type: String }, // 'ACTIVE' | 'INACTIVE' | 'DISCONNECTED'
});

export const Agent = mongoose.model<IAgent>('Agent', AgentSchema);

