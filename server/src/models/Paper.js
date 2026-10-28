import mongoose from 'mongoose';
import { READING_STATUSES, PRIORITIES, PAPER_TYPES } from './constants.js';

const fileSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true }, // GridFS file _id
    key: { type: String, required: true }, // random name stored in GridFS
    originalName: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, default: 'application/pdf' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const paperSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    authors: { type: [String], default: [] },
    year: { type: Number, min: 1800, max: 2100 },
    venue: { type: String, trim: true, maxlength: 200, default: '' },
    paperType: { type: String, enum: PAPER_TYPES, default: 'Journal article' },
    volume: { type: String, trim: true, default: '' },
    issue: { type: String, trim: true, default: '' },
    pages: { type: String, trim: true, default: '' },
    doi: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, default: '' },
    abstract: { type: String, trim: true, maxlength: 5000, default: '' },
    tags: { type: [String], default: [] },
    status: { type: String, enum: READING_STATUSES, default: 'To Read', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'Medium' },
    rating: { type: Number, min: 1, max: 5 },
    readBy: { type: Date }, // target date to finish reading
    finishedAt: { type: Date }, // set when status first becomes Read or Cited
    projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    file: { type: fileSchema, default: undefined },
  },
  { timestamps: true }
);

paperSchema.index({ userId: 1, createdAt: -1 });
paperSchema.index({ userId: 1, tags: 1 });

paperSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    if (ret.file) delete ret.file.key; // the storage key never leaves the server
    return ret;
  },
});

export const Paper = mongoose.model('Paper', paperSchema);
