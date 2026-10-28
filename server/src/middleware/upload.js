import multer from 'multer';
import { ApiError } from '../utils/http.js';

// Vercel serverless functions accept request bodies up to about 4.5 MB,
// so uploads are capped at 4 MB to leave room for the other form fields.
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES, files: 1, fields: 5 },
  fileFilter(_req, file, cb) {
    const looksPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    if (!looksPdf) return cb(new ApiError(400, 'Only PDF files can be uploaded', { file: 'Choose a PDF file' }));
    cb(null, true);
  },
});

/** Accepts an optional single "file" field and turns Multer errors into form errors. */
export function optionalPdf(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return next(new ApiError(413, 'PDF must be 4 MB or smaller', { file: 'PDF must be 4 MB or smaller' }));
    }
    if (err instanceof multer.MulterError) return next(new ApiError(400, 'Upload failed. Try again.', { file: err.message }));
    next(err);
  });
}
