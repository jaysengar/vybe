import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  username: string;
  gender: 'Male' | 'Female';
  age: number;
  diamonds: number;
  xp: number;
  level: number;
  preferences: {
    pushNotifications: boolean;
    cameraAccess: boolean;
    micAccess: boolean;
    language: string;
  };
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed';
  isVip: boolean;
  deviceId?: string;
  blockedUsers: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema: Schema = new Schema({
  username: { type: String, required: true, unique: true },
  gender: { type: String, enum: ['Male', 'Female'], required: true },
  age: { type: Number, required: true },
  diamonds: { type: Number, default: 10 }, // Give users 10 free diamonds to start
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  preferences: {
    pushNotifications: { type: Boolean, default: true },
    cameraAccess: { type: Boolean, default: true },
    micAccess: { type: Boolean, default: true },
    language: { type: String, default: 'English' }
  },
  verificationStatus: { type: String, enum: ['unverified', 'pending', 'verified', 'failed'], default: 'unverified' },
  isVip: { type: Boolean, default: false },
  deviceId: { type: String }, // To track multiple accounts on same phone
  blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'banned'], default: 'active' }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);
