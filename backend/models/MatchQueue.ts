import mongoose, { Document, Schema } from 'mongoose';

export interface IMatchQueue extends Document {
  userId: mongoose.Types.ObjectId;
  socketId: string;
  gender: string;
  filterGender: string;
  location: {
    type: 'Point';
    coordinates: number[]; // [lon, lat]
  };
  skipped: mongoose.Types.ObjectId[];
  lastPingAt: Date;
  createdAt: Date;
}

const MatchQueueSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  socketId: { type: String, required: true },
  gender: { type: String, required: true },
  filterGender: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true } // [lon, lat]
  },
  skipped: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastPingAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

MatchQueueSchema.index({ location: '2dsphere' });
MatchQueueSchema.index({ lastPingAt: 1 }, { expireAfterSeconds: 30 }); // Automatically remove ghosted users after 30 seconds of no ping

export default mongoose.model<IMatchQueue>('MatchQueue', MatchQueueSchema);
