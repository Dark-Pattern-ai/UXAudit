const express = require('express');
const { findReportForResponse } = require('../services/reportService');

const router = express.Router();

router.get('/reports/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const report = await findReportForResponse(reportId);

    if (!report) {
      return res.status(404).json({ success: false, message: '리포트를 찾을 수 없습니다.' });
    }

    // 프론트가 기대하는 형식으로 변환
    const response = {
      id: report.id,
      serviceName: report.serviceName,
      analyzedAt: report.analyzedAt,
      overallRiskScore: report.overallRiskScore,
      overallCategory: report.overallCategory,
      overallRiskLevel: report.overallRiskLevel,
      totalDetected: report.totalDetected,
      summary: report.summary,
      guidelineCompliance: ['MISLEADING', 'OBSTRUCTING', 'PRESSURING', 'EXPLOITING'].map(cat => ({
        category: cat,
        isCompliant: !report.detectedPatterns.some(p => p.category === cat),
        details: report.detectedPatterns.some(p => p.category === cat)
          ? `${cat} 패턴 탐지됨`
          : '위반 없음',
      })),
      detectedPatterns: report.detectedPatterns.map(p => ({
        id: p.id,
        category: p.category,
        patternName: p.patternName,
        riskLevel: p.riskLevel,
        riskScore: p.riskScore,
        description: p.description,
        recommendation: p.recommendation,
        location: p.imageId,
        matchedText: p.evidenceText,
      })),
      uploadedImages: report.images.map(img => ({
        id: img.id,
        fileName: img.fileName,
        url: img.url,
        pageLabel: img.pageLabel,
      })),
    };

    return res.json({ success: true, report: response });
  } catch (error) {
    console.error('리포트 조회 실패:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
