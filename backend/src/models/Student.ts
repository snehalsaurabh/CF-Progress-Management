import mongoose, { Schema, Document } from 'mongoose';
import { IStudent } from '../types/models';

export interface IStudentDocument extends IStudent, Document {}

const StudentSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,  // Keep unique but remove index: true
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ]
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      match: [
        /^[\+]?[1-9][\d]{0,15}$/,
        'Please provide a valid phone number'
      ]
    },
    codeforcesHandle: {
      type: String,
      required: [true, 'Codeforces handle is required'],
      unique: true,  // Keep unique but remove index: true
      trim: true,
      minlength: [3, 'Codeforces handle must be at least 3 characters long'],
      maxlength: [24, 'Codeforces handle cannot exceed 24 characters'],
      match: [
        /^[a-zA-Z0-9_-]+$/,
        'Codeforces handle can only contain letters, numbers, underscores, and hyphens'
      ]
    },
    currentRating: {
      type: Number,
      default: null,
      min: [0, 'Rating cannot be negative'],
      max: [5000, 'Rating cannot exceed 5000']
    },
    maxRating: {
      type: Number,
      default: null,
      min: [0, 'Rating cannot be negative'],
      max: [5000, 'Rating cannot exceed 5000']
    },
    lastDataUpdate: {
      type: Date,
      default: null
    },
    emailNotificationsEnabled: {
      type: Boolean,
      default: true
    },
    reminderEmailCount: {
      type: Number,
      default: 0,
      min: [0, 'Reminder email count cannot be negative']
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
StudentSchema.index({ email: 1 });
StudentSchema.index({ codeforcesHandle: 1 });
StudentSchema.index({ name: 1 });
StudentSchema.index({ lastDataUpdate: 1 });

// Pre-save middleware to update maxRating
StudentSchema.pre<IStudentDocument>('save', function(next) {
  if (this.currentRating && (!this.maxRating || this.currentRating > this.maxRating)) {
    this.maxRating = this.currentRating;
  }
  next();
});

export default mongoose.model<IStudentDocument>('Student', StudentSchema);