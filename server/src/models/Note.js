import mongoose from 'mongoose';
import { NOTE_KINDS } from './constants.js';

const noteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true, index: true },
    kind: { type: String, enum: NOTE_KINDS, default: 'Summary' },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    page: { type: Number, min: 1, max: 10000 },
  },
  { timestamps: true }
);

noteSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export const Note = mongoose.model('Note', noteSchema);
