import mongoose from 'mongoose';
import { PROJECT_TYPES, PROJECT_STATUSES } from './constants.js';

const projectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    type: { type: String, enum: PROJECT_TYPES, default: 'Research paper' },
    status: { type: String, enum: PROJECT_STATUSES, default: 'Planning' },
    deadline: { type: Date },
  },
  { timestamps: true }
);

projectSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Project = mongoose.model('Project', projectSchema);
