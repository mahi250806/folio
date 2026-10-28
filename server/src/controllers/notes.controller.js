import { Note } from '../models/Note.js';
import { Paper } from '../models/Paper.js';
import { ApiError, ok, assertObjectId, escapeRegex } from '../utils/http.js';

async function ownPaper(userId, paperId) {
  const paper = await Paper.findOne({ _id: paperId, userId });
  if (!paper) throw new ApiError(400, 'Choose one of your papers', { paperId: 'Choose one of your papers' });
  return paper;
}

async function ownNote(userId, id) {
  assertObjectId(id, 'Note');
  const note = await Note.findOne({ _id: id, userId });
  if (!note) throw new ApiError(404, 'Note not found');
  return note;
}

export async function listNotes(req, res) {
  const { q, kind, paperId } = req.valid;
  const filter = { userId: req.userId };
  if (kind) filter.kind = kind;
  if (paperId) filter.paperId = paperId;
  if (q) filter.content = new RegExp(escapeRegex(q), 'i');
  const notes = await Note.find(filter)
    .sort({ updatedAt: -1 })
    .populate('paperId', 'title authors year status')
    .lean();
  // Rename the populated field so the client reads note.paper.title
  const data = notes.map(({ paperId: paper, __v, ...n }) => ({ ...n, paperId: paper?._id, paper }));
  ok(res, { notes: data, total: data.length });
}

export async function createNote(req, res) {
  const paper = await ownPaper(req.userId, req.valid.paperId);
  const note = await Note.create({ ...req.valid, page: req.valid.page ?? undefined, userId: req.userId });

  // Writing the first note on an unread paper means reading has started.
  let statusChanged = false;
  if (paper.status === 'To Read') {
    paper.status = 'Reading';
    await paper.save();
    statusChanged = true;
  }
  ok(res, { note, paperStatus: paper.status, statusChanged }, statusChanged ? 'Note added. Paper moved to Reading.' : 'Note added', 201);
}

export async function updateNote(req, res) {
  const note = await ownNote(req.userId, req.params.id);
  await ownPaper(req.userId, req.valid.paperId);
  note.paperId = req.valid.paperId;
  note.kind = req.valid.kind;
  note.content = req.valid.content;
  note.page = req.valid.page ?? undefined;
  await note.save();
  ok(res, { note }, 'Note saved');
}

export async function deleteNote(req, res) {
  const note = await ownNote(req.userId, req.params.id);
  await note.deleteOne();
  ok(res, null, 'Note deleted');
}
