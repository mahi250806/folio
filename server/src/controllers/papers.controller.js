import mongoose from 'mongoose';
import { Paper } from '../models/Paper.js';
import { Project } from '../models/Project.js';
import { Note } from '../models/Note.js';
import { FINISHED_STATUSES } from '../models/constants.js';
import { ApiError, ok, assertObjectId, escapeRegex } from '../utils/http.js';
import { isPdfBuffer, savePdf, openPdfStream, deletePdf } from '../utils/gridfs.js';
import { formatApa, formatBibtex, citeKey } from '../utils/citation.js';
import { lookupDoi } from '../utils/crossref.js';

const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

async function findOwnPaper(userId, id) {
  assertObjectId(id, 'Paper');
  const paper = await Paper.findOne({ _id: id, userId });
  if (!paper) throw new ApiError(404, 'Paper not found');
  return paper;
}

/** Every project id must belong to the current user. */
async function assertOwnProjects(userId, projectIds) {
  if (!projectIds?.length) return;
  const count = await Project.countDocuments({ _id: { $in: projectIds }, userId });
  if (count !== projectIds.length) throw new ApiError(400, 'One of the selected projects was not found', { projectIds: 'Choose projects from your list' });
}

/** Sets finishedAt the first time a paper reaches Read or Cited, and clears it when it goes back. */
function applyStatusSideEffects(paper, nextStatus) {
  if (FINISHED_STATUSES.includes(nextStatus)) {
    if (!paper.finishedAt) paper.finishedAt = new Date();
  } else if (nextStatus !== 'Dropped') {
    paper.finishedAt = undefined;
  }
  paper.status = nextStatus;
}

function assertPdf(file) {
  if (file && !isPdfBuffer(file.buffer)) {
    throw new ApiError(400, 'That file is not a real PDF', { file: 'That file is not a real PDF' });
  }
}

/* ---------- list / search ---------- */

export async function listPapers(req, res) {
  const { q, status, priority, projectId, tag, hasPdf, sort } = req.valid;
  const filter = { userId: req.userId };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (projectId) filter.projectIds = projectId;
  if (tag) filter.tags = tag;
  if (hasPdf === 'yes') filter.file = { $exists: true };
  if (hasPdf === 'no') filter.file = { $exists: false };
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { authors: rx }, { venue: rx }, { tags: rx }, { doi: rx }];
  }

  const sorts = {
    newest: { createdAt: -1 },
    oldest: { createdAt: 1 },
    title: { title: 1 },
    year: { year: -1, title: 1 },
    readBy: { readBy: 1, createdAt: -1 },
    priority: { createdAt: -1 },
  };

  let papers = await Paper.find(filter).sort(sorts[sort]).populate('projectIds', 'title').lean();

  // Papers without a target date go last when sorting by target date.
  if (sort === 'readBy') papers = [...papers.filter((p) => p.readBy), ...papers.filter((p) => !p.readBy)];
  if (sort === 'priority') papers.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);

  const counts = await Note.aggregate([
    { $match: { paperId: { $in: papers.map((p) => p._id) } } },
    { $group: { _id: '$paperId', n: { $sum: 1 } } },
  ]);
  const noteCount = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));

  const data = papers.map(({ __v, file, ...p }) => ({
    ...p,
    projects: p.projectIds,
    projectIds: p.projectIds.map((pr) => pr._id),
    file: file ? { originalName: file.originalName, size: file.size, uploadedAt: file.uploadedAt } : undefined,
    noteCount: noteCount[String(p._id)] || 0,
  }));
  ok(res, { papers: data, total: data.length });
}

export async function listTags(req, res) {
  const rows = await Paper.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);
  ok(res, { tags: rows.map((r) => ({ tag: r._id, count: r.count })) });
}

/* ---------- single paper ---------- */

export async function getPaper(req, res) {
  const paper = await findOwnPaper(req.userId, req.params.id);
  await paper.populate('projectIds', 'title status deadline');
  const notes = await Note.find({ paperId: paper._id, userId: req.userId }).sort({ page: 1, createdAt: 1 });
  const json = paper.toJSON();
  ok(res, {
    paper: { ...json, projects: json.projectIds, projectIds: json.projectIds.map((p) => p._id) },
    notes,
    citation: { apa: formatApa(paper), bibtex: formatBibtex(paper), key: citeKey(paper) },
  });
}

export async function createPaper(req, res) {
  assertPdf(req.file);
  await assertOwnProjects(req.userId, req.valid.projectIds);

  const paper = new Paper({ ...req.valid, userId: req.userId });
  applyStatusSideEffects(paper, req.valid.status);
  if (req.file) {
    paper.file = await savePdf(req.file.buffer, { userId: req.userId, originalName: req.file.originalname });
  }
  try {
    await paper.save();
  } catch (err) {
    if (paper.file) await deletePdf(paper.file.fileId); // no orphaned uploads
    throw err;
  }
  ok(res, { paper }, 'Paper added', 201);
}

export async function updatePaper(req, res) {
  assertPdf(req.file);
  const paper = await findOwnPaper(req.userId, req.params.id);
  await assertOwnProjects(req.userId, req.valid.projectIds);

  const { status, ...fields } = req.valid;
  // Fields cleared on the form arrive as null and are removed from the document.
  for (const [k, v] of Object.entries(fields)) paper.set(k, v === null ? undefined : v);
  applyStatusSideEffects(paper, status);

  const oldFileId = paper.file?.fileId;
  if (req.file) {
    paper.file = await savePdf(req.file.buffer, { userId: req.userId, originalName: req.file.originalname });
  }
  await paper.save();
  if (req.file && oldFileId) await deletePdf(oldFileId); // replaced: remove the previous PDF
  ok(res, { paper }, 'Paper saved');
}

export async function updatePaperStatus(req, res) {
  const paper = await findOwnPaper(req.userId, req.params.id);
  const { status } = req.valid;
  if (status === 'Cited' && paper.projectIds.length === 0) {
    throw new ApiError(400, 'Link the paper to a project before marking it Cited', { status: 'Link the paper to a project first' });
  }
  applyStatusSideEffects(paper, status);
  await paper.save();
  ok(res, { paper }, `Marked as ${status}`);
}

export async function deletePaper(req, res) {
  const paper = await findOwnPaper(req.userId, req.params.id);
  const { deletedCount } = await Note.deleteMany({ paperId: paper._id, userId: req.userId });
  if (paper.file?.fileId) await deletePdf(paper.file.fileId);
  await paper.deleteOne();
  ok(res, { deletedNotes: deletedCount }, 'Paper deleted');
}

/* ---------- PDF ---------- */

export async function streamPdf(req, res) {
  const paper = await findOwnPaper(req.userId, req.params.id);
  if (!paper.file?.fileId) throw new ApiError(404, 'This paper has no PDF attached');

  const safeName = paper.file.originalName.replace(/[^\w.\- ]+/g, '_');
  const disposition = req.query.download === '1' ? 'attachment' : 'inline';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', paper.file.size);
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
  res.setHeader('Cache-Control', 'private, max-age=0, no-store');
  // Helmet's CSP (object-src 'none') would stop the browser's PDF viewer from rendering.
  // nosniff stays on, so the file is only ever treated as a PDF.
  res.removeHeader('Content-Security-Policy');

  const stream = openPdfStream(paper.file.fileId);
  stream.on('error', () => {
    if (!res.headersSent) res.status(404).json({ success: false, message: 'PDF not found in storage' });
    else res.end();
  });
  stream.pipe(res);
}

export async function uploadPdf(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose a PDF file', { file: 'Choose a PDF file' });
  assertPdf(req.file);
  const paper = await findOwnPaper(req.userId, req.params.id);
  const oldFileId = paper.file?.fileId;
  paper.file = await savePdf(req.file.buffer, { userId: req.userId, originalName: req.file.originalname });
  await paper.save();
  if (oldFileId) await deletePdf(oldFileId);
  ok(res, { paper }, oldFileId ? 'PDF replaced' : 'PDF uploaded');
}

export async function removePdf(req, res) {
  const paper = await findOwnPaper(req.userId, req.params.id);
  if (!paper.file?.fileId) throw new ApiError(404, 'This paper has no PDF attached');
  const fileId = paper.file.fileId;
  paper.file = undefined;
  await paper.save();
  await deletePdf(fileId);
  ok(res, { paper }, 'PDF removed');
}

/* ---------- metadata helpers ---------- */

export async function doiLookup(req, res) {
  const meta = await lookupDoi(req.query.doi);
  const existing = await Paper.findOne({ userId: req.userId, doi: meta.doi }).select('_id title');
  ok(res, { meta, duplicateOf: existing || null }, 'Details found');
}

const csvCell = (v) => {
  const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  // Neutralise spreadsheet formulas and quote every cell.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export async function exportCsv(req, res) {
  const papers = await Paper.find({ userId: req.userId }).sort({ createdAt: -1 }).populate('projectIds', 'title').lean();
  const header = ['Title', 'Authors', 'Year', 'Venue', 'Type', 'DOI', 'URL', 'Status', 'Priority', 'Rating', 'Tags', 'Projects', 'Read by', 'Finished', 'Added', 'APA citation'];
  const rows = papers.map((p) =>
    [
      p.title, p.authors, p.year, p.venue, p.paperType, p.doi, p.url, p.status, p.priority, p.rating, p.tags,
      p.projectIds.map((x) => x.title), p.readBy, p.finishedAt, p.createdAt, formatApa(p),
    ].map(csvCell).join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="folio-library-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${[header.map(csvCell).join(','), ...rows].join('\r\n')}`);
}
