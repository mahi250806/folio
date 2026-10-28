import mongoose from 'mongoose';
import { Project } from '../models/Project.js';
import { Paper } from '../models/Paper.js';
import { ApiError, ok, assertObjectId } from '../utils/http.js';
import { formatApa, formatBibtexFile } from '../utils/citation.js';

async function ownProject(userId, id) {
  assertObjectId(id, 'Project');
  const project = await Project.findOne({ _id: id, userId });
  if (!project) throw new ApiError(404, 'Project not found');
  return project;
}

const firstAuthorSurname = (p) => {
  const a = (p.authors || [])[0] || '';
  return (a.includes(',') ? a.split(',')[0] : a.split(' ').pop()).toLowerCase();
};

export async function listProjects(req, res) {
  const projects = await Project.find({ userId: req.userId }).sort({ deadline: 1, createdAt: -1 }).lean();
  const stats = await Paper.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(req.userId) } },
    { $unwind: '$projectIds' },
    {
      $group: {
        _id: '$projectIds',
        total: { $sum: 1 },
        finished: { $sum: { $cond: [{ $in: ['$status', ['Read', 'Cited']] }, 1, 0] } },
        cited: { $sum: { $cond: [{ $eq: ['$status', 'Cited'] }, 1, 0] } },
      },
    },
  ]);
  const byId = Object.fromEntries(stats.map((s) => [String(s._id), s]));
  // Projects with a deadline first (soonest first), then the rest.
  const sorted = [...projects.filter((p) => p.deadline), ...projects.filter((p) => !p.deadline)];
  const data = sorted.map(({ __v, ...p }) => {
    const s = byId[String(p._id)] || { total: 0, finished: 0, cited: 0 };
    return { ...p, paperCount: s.total, finishedCount: s.finished, citedCount: s.cited };
  });
  ok(res, { projects: data, total: data.length });
}

export async function getProject(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  const papers = (await Paper.find({ userId: req.userId, projectIds: project._id }).lean()).sort(
    (a, b) => firstAuthorSurname(a).localeCompare(firstAuthorSurname(b)) || (a.year || 0) - (b.year || 0)
  );
  ok(res, {
    project,
    papers: papers.map(({ __v, file, ...p }) => ({ ...p, hasPdf: Boolean(file), apa: formatApa(p) })),
  });
}

export async function createProject(req, res) {
  const project = await Project.create({ ...req.valid, deadline: req.valid.deadline ?? undefined, userId: req.userId });
  ok(res, { project }, 'Project created', 201);
}

export async function updateProject(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  const { deadline, ...fields } = req.valid;
  project.set(fields);
  project.deadline = deadline ?? undefined;
  await project.save();
  ok(res, { project }, 'Project saved');
}

export async function deleteProject(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  // Papers are kept; they are only unlinked from this project.
  const { modifiedCount } = await Paper.updateMany(
    { userId: req.userId, projectIds: project._id },
    { $pull: { projectIds: project._id } }
  );
  // A paper left Cited with no project goes back to Read, keeping the Cited rule true.
  await Paper.updateMany({ userId: req.userId, status: 'Cited', projectIds: { $size: 0 } }, { $set: { status: 'Read' } });
  await project.deleteOne();
  ok(res, { unlinkedPapers: modifiedCount }, 'Project deleted');
}

export async function linkPapers(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  const { paperIds } = req.valid;
  const owned = await Paper.countDocuments({ _id: { $in: paperIds }, userId: req.userId });
  if (owned !== paperIds.length) throw new ApiError(400, 'One of the selected papers was not found', { paperIds: 'Choose papers from your library' });
  const { modifiedCount } = await Paper.updateMany(
    { _id: { $in: paperIds }, userId: req.userId },
    { $addToSet: { projectIds: project._id } }
  );
  ok(res, { linked: modifiedCount }, `${modifiedCount} paper${modifiedCount === 1 ? '' : 's'} added to the project`);
}

export async function unlinkPaper(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  assertObjectId(req.params.paperId, 'Paper');
  const paper = await Paper.findOne({ _id: req.params.paperId, userId: req.userId, projectIds: project._id });
  if (!paper) throw new ApiError(404, 'That paper is not in this project');
  paper.projectIds.pull(project._id);
  // Keep the rule that Cited papers belong to at least one project.
  if (paper.status === 'Cited' && paper.projectIds.length === 0) paper.status = 'Read';
  await paper.save();
  ok(res, { paper }, 'Paper removed from the project');
}

export async function projectBibliography(req, res) {
  const project = await ownProject(req.userId, req.params.id);
  const onlyCited = req.query.cited === '1';
  const filter = { userId: req.userId, projectIds: project._id, ...(onlyCited ? { status: 'Cited' } : {}) };
  const papers = (await Paper.find(filter).lean()).sort(
    (a, b) => firstAuthorSurname(a).localeCompare(firstAuthorSurname(b)) || (a.year || 0) - (b.year || 0)
  );
  const format = req.query.format === 'apa' ? 'apa' : 'bibtex';
  const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project';

  if (format === 'apa') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}-references.txt"`);
    return res.send(papers.map(formatApa).join('\n\n'));
  }
  res.setHeader('Content-Type', 'application/x-bibtex; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${slug}.bib"`);
  res.send(formatBibtexFile(papers));
}
