import crypto from 'node:crypto';
import mongoose from 'mongoose';

const BUCKET = 'papers';

function bucket() {
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET });
}

/** Real PDFs start with "%PDF-". This catches files renamed to .pdf. */
export function isPdfBuffer(buf) {
  return Buffer.isBuffer(buf) && buf.length > 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
}

/** Stores a PDF buffer in GridFS under a random key and returns its metadata. */
export function savePdf(buffer, { userId, originalName }) {
  const key = `${crypto.randomUUID()}.pdf`;
  return new Promise((resolve, reject) => {
    const stream = bucket().openUploadStream(key, {
      metadata: { userId: String(userId), originalName, contentType: 'application/pdf' },
    });
    stream.once('error', reject);
    stream.once('finish', () =>
      resolve({
        fileId: stream.id,
        key,
        originalName,
        size: buffer.length,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
      })
    );
    stream.end(buffer);
  });
}

export function openPdfStream(fileId) {
  return bucket().openDownloadStream(new mongoose.Types.ObjectId(String(fileId)));
}

/** Deletes a stored PDF; a missing file is not an error. */
export async function deletePdf(fileId) {
  if (!fileId) return;
  try {
    await bucket().delete(new mongoose.Types.ObjectId(String(fileId)));
  } catch (err) {
    if (!/FileNotFound|File not found/i.test(err?.message || '')) throw err;
  }
}
