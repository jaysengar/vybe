import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  gender: 'Male' | 'Female';
  age: number;
  diamonds: number;
  isVip: boolean;
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  age: { type: Number, required: true },
  diamonds: { type: Number, default: 50 }, // Give users 50 free diamonds to start
  isVip: { type: Boolean, default: false },
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'banned'], default: 'active' }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
