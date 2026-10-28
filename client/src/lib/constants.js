// Must match server/src/models/constants.js
export const READING_STATUSES = ['To Read', 'Reading', 'Read', 'Cited', 'Dropped'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const PAPER_TYPES = ['Journal article', 'Conference paper', 'Preprint', 'Book chapter', 'Thesis', 'Report', 'Other'];
export const PROJECT_TYPES = ['Research paper', 'Literature review', 'Course assignment', 'Thesis', 'Personal reading'];
export const PROJECT_STATUSES = ['Planning', 'Active', 'Writing', 'Submitted', 'Completed'];
export const NOTE_KINDS = ['Summary', 'Key finding', 'Method', 'Quote', 'Question', 'Critique', 'Idea'];

export const STATUS_HINTS = {
  'To Read': 'On your list, not started',
  Reading: 'In progress',
  Read: 'Finished',
  Cited: 'Used in a project',
  Dropped: 'Not worth finishing',
};

export const MAX_PDF_MB = 4;
