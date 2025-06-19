import mongoose, { Schema, Document } from 'mongoose';

export interface ISubmissionDocument extends Document {
  studentId: mongoose.Types.ObjectId;
  codeforcesHandle: string;
  submissionId: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: {
    contestId?: number;
    index: string;
    name: string;
    type: string;
    rating?: number;
    tags: string[];
  };
  author: {
    contestId?: number;
    members: Array<{
      handle: string;
    }>;
    participantType: string;
    ghost: boolean;
    startTimeSeconds?: number;
  };
  programmingLanguage: string;
  verdict: string;
  testset: string;
  passedTestCount: number;
  timeConsumedMillis: number;
  memoryConsumedBytes: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubmissionSchema: Schema = new Schema(
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
    submissionId: {
      type: Number,
      required: true,
      unique: true
    },
    contestId: {
      type: Number,
      index: true
    },
    creationTimeSeconds: {
      type: Number,
      required: true,
      index: true
    },
    relativeTimeSeconds: {
      type: Number,
      required: true
    },
    problem: {
      contestId: Number,
      index: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      type: {
        type: String,
        required: true
      },
      rating: Number,
      tags: [{
        type: String
      }]
    },
    author: {
      contestId: Number,
      members: [{
        handle: {
          type: String,
          required: true
        }
      }],
      participantType: {
        type: String,
        required: true
      },
      ghost: {
        type: Boolean,
        required: true
      },
      startTimeSeconds: Number
    },
    programmingLanguage: {
      type: String,
      required: true
    },
    verdict: {
      type: String,
      required: true,
      index: true
    },
    testset: {
      type: String,
      required: true
    },
    passedTestCount: {
      type: Number,
      required: true
    },
    timeConsumedMillis: {
      type: Number,
      required: true
    },
    memoryConsumedBytes: {
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
SubmissionSchema.index({ studentId: 1, creationTimeSeconds: -1 });
SubmissionSchema.index({ codeforcesHandle: 1, creationTimeSeconds: -1 });
SubmissionSchema.index({ 'problem.rating': 1 });
SubmissionSchema.index({ verdict: 1, creationTimeSeconds: -1 });

export default mongoose.model<ISubmissionDocument>('Submission', SubmissionSchema); 