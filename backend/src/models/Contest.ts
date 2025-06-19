import mongoose, { Schema, Document } from 'mongoose';

export interface IContestDocument extends Document {
  contestId: number;
  contestName: string;
  phase: string;
  frozen: boolean;
  durationSeconds: number;
  startTimeSeconds: number;
  relativeTimeSeconds?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const ContestSchema: Schema = new Schema(
  {
    contestId: {
      type: Number,
      required: true,
      unique: true,
    },
    contestName: {
      type: String,
      required: true
    },
    phase: {
      type: String,
      required: true,
      enum: ['BEFORE', 'CODING', 'PENDING_SYSTEM_TEST', 'SYSTEM_TEST', 'FINISHED']
    },
    frozen: {
      type: Boolean,
      required: true,
      default: false
    },
    durationSeconds: {
      type: Number,
      required: true
    },
    startTimeSeconds: {
      type: Number,
      required: true,
      index: true
    },
    relativeTimeSeconds: {
      type: Number
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Indexes for better query performance
ContestSchema.index({ startTimeSeconds: -1 });
ContestSchema.index({ phase: 1 });

export default mongoose.model<IContestDocument>('Contest', ContestSchema); 