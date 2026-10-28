import mongoose from 'mongoose';
import { Paper } from '../models/Paper.js';
import { Project } from '../models/Project.js';
import { Note } from '../models/Note.js';
import { READING_STATUSES, UNREAD_STATUSES } from '../models/constants.js';
import { ok } from '../utils/http.js';

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0); // dates are stored as UTC midnight
  return x;
}

export async function stats(req, res) {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const today = startOfDay();
  const in7 = new Date(today.getTime() + 8 * DAY); // end of the 7th day
  const in30 = new Date(today.getTime() + 31 * DAY);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const sixMonthsAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

  const [
    byStatusRows, totalNotes, pdfCount, finishedThisMonth, activeProjects,
    recentPapers, overdue, dueSoon, deadlines, monthlyRows, topTags, recentNotes, notedPaperIds,
  ] = await Promise.all([
    Paper.aggregate([{ $match: { userId } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Note.countDocuments({ userId }),
    Paper.countDocuments({ userId, file: { $exists: true } }),
    Paper.countDocuments({ userId, finishedAt: { $gte: monthStart } }),
    Project.countDocuments({ userId, status: { $in: ['Planning', 'Active', 'Writing'] } }),
    Paper.find({ userId }).sort({ createdAt: -1 }).limit(5).select('title authors year venue status createdAt file').lean(),
    Paper.find({ userId, status: { $in: UNREAD_STATUSES }, readBy: { $lt: today } }).sort({ readBy: 1 }).limit(6).select('title readBy status priority').lean(),
    Paper.find({ userId, status: { $in: UNREAD_STATUSES }, readBy: { $gte: today, $lt: in7 } }).sort({ readBy: 1 }).limit(6).select('title readBy status priority').lean(),
    Project.find({ userId, status: { $nin: ['Submitted', 'Completed'] }, deadline: { $gte: today, $lt: in30 } }).sort({ deadline: 1 }).limit(5).lean(),
    Paper.aggregate([
      { $match: { userId, finishedAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { y: { $year: '$finishedAt' }, m: { $month: '$finishedAt' } }, n: { $sum: 1 } } },
    ]),
    Paper.aggregate([
      { $match: { userId } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', n: { $sum: 1 } } },
      { $sort: { n: -1, _id: 1 } },
      { $limit: 8 },
    ]),
    Note.find({ userId }).sort({ createdAt: -1 }).limit(3).populate('paperId', 'title').lean(),
    Note.distinct('paperId', { userId }),
  ]);

  const byStatus = Object.fromEntries(READING_STATUSES.map((s) => [s, 0]));
  for (const r of byStatusRows) byStatus[r._id] = r.n;
  const totalPapers = Object.values(byStatus).reduce((a, b) => a + b, 0);

  // Six month buckets, oldest first, zero-filled.
  const monthly = [];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    const row = monthlyRows.find((r) => r._id.y === d.getUTCFullYear() && r._id.m === d.getUTCMonth() + 1);
    monthly.push({ month: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }), year: d.getUTCFullYear(), count: row?.n || 0 });
  }

  const daysFrom = (date) => Math.round((startOfDay(date) - today) / DAY);

  ok(res, {
    totals: {
      papers: totalPapers,
      toRead: byStatus['To Read'],
      reading: byStatus.Reading,
      finished: byStatus.Read + byStatus.Cited,
      cited: byStatus.Cited,
      notes: totalNotes,
      notedPapers: notedPaperIds.length,
      pdfs: pdfCount,
      finishedThisMonth,
      activeProjects,
    },
    byStatus,
    monthly,
    topTags: topTags.map((t) => ({ tag: t._id, count: t.n })),
    recentPapers: recentPapers.map(({ file, ...p }) => ({ ...p, hasPdf: Boolean(file) })),
    readingQueue: {
      overdue: overdue.map((p) => ({ ...p, days: daysFrom(p.readBy) })),
      dueSoon: dueSoon.map((p) => ({ ...p, days: daysFrom(p.readBy) })),
    },
    deadlines: deadlines.map((p) => ({ ...p, days: daysFrom(p.deadline) })),
    recentNotes: recentNotes.map(({ paperId, ...n }) => ({ ...n, paper: paperId })),
  });
}
