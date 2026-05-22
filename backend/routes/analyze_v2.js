const express = require('express');
const multer = require('multer');

const { analyzeUploadedImage } = require('../services/analyzeService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

router.post('/analyze-v2', upload.single('image'), async (req, res) => {
  try {
    console.log('request received');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '이미지 파일이 필요합니다. form-data의 image 필드로 업로드하세요.',
      });
    }

    const serviceName =
      req.body.serviceName ||
      req.body.service_name ||
      '테스트 서비스';

    const pageLabel =
      req.body.pageLabel ||
      req.body.page_label ||
      '분석 화면';

    const result = await analyzeUploadedImage({
      file: req.file,
      serviceName,
      pageLabel,
    });

    console.log('completed:', result.reportId);

    return res.status(201).json({
      success: true,
      message: '분석이 완료되었습니다.',
      reportId: result.reportId,
      status: result.status,
      overallCategory: result.overallCategory,
      overallRiskLevel: result.overallRiskLevel,
      overallRiskScore: result.overallRiskScore,
      totalDetected: result.totalDetected,
      reportUrl: `/api/reports/${result.reportId}`,
    });
  } catch (error) {
    console.error('failed:', error);

    return res.status(500).json({
      success: false,
      message: error.message || '분석 요청 처리 중 오류가 발생했습니다.',
    });
  }
});

module.exports = router;