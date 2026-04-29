const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getExtension(file) {
  const originalName = file.originalname || '';
  const ext = path.extname(originalName).toLowerCase();

  if (ext) return ext;

  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/jpeg') return '.jpg';
  if (file.mimetype === 'image/webp') return '.webp';

  return '.png';
}

function saveUploadedImage({ file, reportId, imageId }) {
  if (!file || !file.buffer) {
    throw new Error('업로드된 이미지 파일이 없습니다.');
  }

  const uploadDir = path.join(process.cwd(), 'uploads', 'reports', reportId);
  ensureDir(uploadDir);

  const ext = getExtension(file);
  const storedFileName = `${imageId}${ext}`;
  const filePath = path.join(uploadDir, storedFileName);

  fs.writeFileSync(filePath, file.buffer);

  const url = `/uploads/reports/${reportId}/${storedFileName}`;

  return {
    fileName: file.originalname || storedFileName,
    storedFileName,
    filePath,
    url,
    mimeType: file.mimetype || null,
    fileSize: file.size || file.buffer.length || null,
  };
}

module.exports = {
  saveUploadedImage,
};