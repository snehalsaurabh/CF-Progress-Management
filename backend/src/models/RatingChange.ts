import mongoose, { Schema, Document } from 'mongoose';

export interface IRatingChangeDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  codeforcesHandle: string;
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const RatingChangeSchema: Schema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      index: true
    },
    codeforcesHandle: {
      type: String,
      required: true,
      index: true
    },
    contestId: {
      type: Number,
      required: true,
      index: true
    },
    contestName: {
      type: String,
      required: true
    },
    handle: {
      type: String,
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    ratingUpdateTimeSeconds: {
      type: Number,
      required: true,
      index: true
    },
    oldRating: {
      type: Number,
      required: true
    },
    newRating: {
      type: Number,
      required: true
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
RatingChangeSchema.index({ studentId: 1, ratingUpdateTimeSeconds: -1 });
RatingChangeSchema.index({ codeforcesHandle: 1, ratingUpdateTimeSeconds: -1 });
RatingChangeSchema.index({ contestId: 1 });

// Compound unique index to prevent duplicate rating changes
RatingChangeSchema.index({ codeforcesHandle: 1, contestId: 1 }, { unique: true });

export default mongoose.model<IRatingChangeDocument>('RatingChange', RatingChangeSchema); 