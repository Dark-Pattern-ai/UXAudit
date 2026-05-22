const crypto = require('crypto');

const { analyzeImageWithAI } = require('./aiClient');
const { saveUploadedImage } = require('./uploadService');
const {
  createProcessingReport,
  createReportImage,
  saveOcrResult,
  saveFeatureVector,
  saveDetectedPatterns,
  completeReport,
  failReport,
} = require('./reportService');

function validateImageFile(file) {
  if (!file) {
    throw new Error('이미지 파일이 필요합니다.');
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('PNG, JPG, JPEG, WEBP 이미지만 업로드할 수 있습니다.');
  }
}

async function analyzeUploadedImage({ file, serviceName, pageLabel }) {
  validateImageFile(file);

  const startedAt = new Date();

  let report = null;

  try {
    report = await createProcessingReport({
      serviceName,
    });

    const imageId = crypto.randomUUID();

    const fileMeta = saveUploadedImage({
      file,
      reportId: report.id,
      imageId,
    });

    const reportImage = await createReportImage({
      imageId,
      reportId: report.id,
      fileMeta,
      pageLabel,
    });

    const aiResult = await analyzeImageWithAI(fileMeta.filePath);

    await saveOcrResult({
      imageId: reportImage.id,
      aiResult,
    });

    await saveFeatureVector({
      imageId: reportImage.id,
      aiResult,
    });

    await saveDetectedPatterns({
      reportId: report.id,
      imageId: reportImage.id,
      aiResult,
    });

    const completedReport = await completeReport({
      reportId: report.id,
      aiResult,
      startedAt,
    });

    return {
      reportId: completedReport.id,
      status: completedReport.status,
      overallCategory: completedReport.overallCategory,
      overallRiskLevel: completedReport.overallRiskLevel,
      overallRiskScore: completedReport.overallRiskScore,
      totalDetected: completedReport.totalDetected,
    };
  } catch (error) {
    if (report?.id) {
      await failReport({
        reportId: report.id,
        error,
      });
    }

    throw error;
  }
}

module.exports = {
  analyzeUploadedImage,
};