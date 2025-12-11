import mongoose, { Schema, Document } from 'mongoose';

export interface IAdAccount extends Document {
  id: string;
  user_id: string;
  agent_id?: string;
  meta_ad_account_id: string;
  name: string;
  cred_ref?: string;
  currency_code?: string;
  is_active: boolean;
  // OAuth tokens
  meta_access_token?: string;
  meta_token_expires_at?: Date;
  meta_refresh_token?: string;
  meta_user_id?: string;
  meta_connected_at?: Date;
  meta_last_synced_at?: Date;
}

const AdAccountSchema = new Schema<IAdAccount>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  agent_id: { type: String, index: true },
  meta_ad_account_id: { type: String, required: true },
  name: { type: String, required: true },
  cred_ref: { type: String },
  currency_code: { type: String },
  is_active: { type: Boolean, default: true, required: true },
  // OAuth tokens
  meta_access_token: { type: String },
  meta_token_expires_at: { type: Date },
  meta_refresh_token: { type: String },
  meta_user_id: { type: String },
  meta_connected_at: { type: Date },
  meta_last_synced_at: { type: Date },
});

export const AdAccount = mongoose.model<IAdAccount>('AdAccount', AdAccountSchema);

