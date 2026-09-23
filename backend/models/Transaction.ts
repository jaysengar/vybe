import mongoose, { Document, Schema } from 'mongoose';

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'earn' | 'spend' | 'purchase';
  amount: number;
  reason: string;
  createdAt: Date;
}

const TransactionSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['earn', 'spend', 'purchase'], required: true },
  amount: { type: Number, required: true },
  reason: { type: String, required: true },
}, {
  timestamps: true
});

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
