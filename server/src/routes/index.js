import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { optionalPdf } from '../middleware/upload.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as papers from '../controllers/papers.controller.js';
import * as notes from '../controllers/notes.controller.js';
import * as projects from '../controllers/projects.controller.js';
import * as dashboard from '../controllers/dashboard.controller.js';

const r = Router();

r.get('/health', (_req, res) => res.json({ success: true, message: 'OK', data: { status: 'up', time: new Date().toISOString() } }));

/* Auth */
r.post('/auth/register', validate(S.registerSchema), auth.register);
r.post('/auth/login', validate(S.loginSchema), auth.login);
r.post('/auth/logout', auth.logout);
r.get('/auth/me', requireAuth, auth.me);
r.put('/auth/me', requireAuth, validate(S.profileSchema), auth.updateMe);
r.put('/auth/password', requireAuth, validate(S.passwordSchema), auth.changePassword);

/* Everything below requires login */
r.use(requireAuth);

/* Papers — fixed paths before /:id */
r.get('/papers/export.csv', papers.exportCsv);
r.get('/papers/lookup', papers.doiLookup);
r.get('/papers/tags', papers.listTags);
r.get('/papers', validate(S.paperQuerySchema, 'query'), papers.listPapers);
r.post('/papers', optionalPdf, validate(S.paperSchema), papers.createPaper);
r.get('/papers/:id', papers.getPaper);
r.put('/papers/:id', optionalPdf, validate(S.paperSchema), papers.updatePaper);
r.patch('/papers/:id/status', validate(S.paperStatusSchema), papers.updatePaperStatus);
r.delete('/papers/:id', papers.deletePaper);
r.get('/papers/:id/file', papers.streamPdf);
r.put('/papers/:id/file', optionalPdf, papers.uploadPdf);
r.delete('/papers/:id/file', papers.removePdf);

/* Notes */
r.get('/notes', validate(S.noteQuerySchema, 'query'), notes.listNotes);
r.post('/notes', validate(S.noteSchema), notes.createNote);
r.put('/notes/:id', validate(S.noteSchema), notes.updateNote);
r.delete('/notes/:id', notes.deleteNote);

/* Projects */
r.get('/projects', projects.listProjects);
r.post('/projects', validate(S.projectSchema), projects.createProject);
r.get('/projects/:id', projects.getProject);
r.put('/projects/:id', validate(S.projectSchema), projects.updateProject);
r.delete('/projects/:id', projects.deleteProject);
r.get('/projects/:id/bibliography', projects.projectBibliography);
r.post('/projects/:id/papers', validate(S.linkPapersSchema), projects.linkPapers);
r.delete('/projects/:id/papers/:paperId', projects.unlinkPaper);

/* Dashboard */
r.get('/dashboard/stats', dashboard.stats);

export default r;
