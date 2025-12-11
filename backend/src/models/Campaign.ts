import mongoose, { Schema, Document } from 'mongoose';

export interface ICampaign extends Document {
  id: string;
  user_id: string;
  ad_account_id: string;
  meta_id: string;
  name: string;
  status: string;
}

const CampaignSchema = new Schema<ICampaign>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  ad_account_id: { type: String, required: true, index: true },
  meta_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  status: { type: String, required: true },
});

export const Campaign = mongoose.model<ICampaign>('Campaign', CampaignSchema);

