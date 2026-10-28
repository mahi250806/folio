// Shared enums. The client keeps an identical copy in client/src/lib/constants.js.
export const READING_STATUSES = ['To Read', 'Reading', 'Read', 'Cited', 'Dropped'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const PAPER_TYPES = ['Journal article', 'Conference paper', 'Preprint', 'Book chapter', 'Thesis', 'Report', 'Other'];
export const PROJECT_TYPES = ['Research paper', 'Literature review', 'Course assignment', 'Thesis', 'Personal reading'];
export const PROJECT_STATUSES = ['Planning', 'Active', 'Writing', 'Submitted', 'Completed'];
export const NOTE_KINDS = ['Summary', 'Key finding', 'Method', 'Quote', 'Question', 'Critique', 'Idea'];

// Statuses that mean the paper still has to be read.
export const UNREAD_STATUSES = ['To Read', 'Reading'];
// Statuses that mean the paper has been finished.
export const FINISHED_STATUSES = ['Read', 'Cited'];
