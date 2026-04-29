const prisma = require('../lib/prisma');

const REPORT_CATEGORIES = [
  'NORMAL',
  'MISLEADING',
  'OBSTRUCTING',
  'PRESSURING',
  'EXPLOITING',
];

const PATTERN_CATEGORIES = [
  'MISLEADING',
  'OBSTRUCTING',
  'PRESSURING',
  'EXPLOITING',
];

const RISK_LEVELS = [
  'SAFE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL',
];

const DETECTED_BY_TYPES = [
  'RULE',
  'MODEL',
  'LLM',
  'HYBRID',
];

function toNumber(value, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function mapRiskLevelByScore(score) {
  const riskScore = toNumber(score, 0);

  if (riskScore >= 90) return 'CRITICAL';
  if (riskScore >= 70) return 'HIGH';
  if (riskScore >= 40) return 'MEDIUM';
  if (riskScore > 0) return 'LOW';

  return 'SAFE';
}

function normalizeReportCategory(category) {
  if (REPORT_CATEGORIES.includes(category)) {
    return category;
  }

  return 'NORMAL';
}

function normalizePatternCategory(category) {
  if (PATTERN_CATEGORIES.includes(category)) {
    return category;
  }

  return null;
}

function normalizeRiskLevel(riskLevel, riskScore = 0) {
  if (RISK_LEVELS.includes(riskLevel)) {
    return riskLevel;
  }

  return mapRiskLevelByScore(riskScore);
}

function normalizeDetectedBy(detectedBy) {
  if (DETECTED_BY_TYPES.includes(detectedBy)) {
    return detectedBy;
  }

  return 'MODEL';
}

function getOcrFromAIResult(aiResult) {
  if (!aiResult) return null;

  if (aiResult.ocr) {
    return aiResult.ocr;
  }

  // AI 서버가 /ai/ocr 형태로 바로 응답하는 경우도 임시 호환
  if (aiResult.text || aiResult.lines || aiResult.boxes) {
    return aiResult;
  }

  return null;
}

function getDetectedPatternsFromAIResult(aiResult) {
  if (!aiResult) return [];

  return (
    aiResult.detectedPatterns ||
    aiResult.detected_patterns ||
    aiResult.patterns ||
    []
  );
}

function getFeatureVectorFromAIResult(aiResult) {
  if (!aiResult) return null;

  return (
    aiResult.featureVector ||
    aiResult.feature_vector ||
    null
  );
}

async function createProcessingReport({ serviceName }) {
  return prisma.report.create({
    data: {
      serviceName: serviceName || '이름 없는 서비스',
      status: 'PROCESSING',
      analysisStartedAt: new Date(),
    },
  });
}

async function createReportImage({
  imageId,
  reportId,
  fileMeta,
  pageLabel,
}) {
  return prisma.reportImage.create({
    data: {
      id: imageId,
      reportId,
      fileName: fileMeta.fileName,
      filePath: fileMeta.filePath,
      url: fileMeta.url,
      pageLabel: pageLabel || null,
      mimeType: fileMeta.mimeType || null,
      fileSize: fileMeta.fileSize || null,
      width: fileMeta.width || null,
      height: fileMeta.height || null,
    },
  });
}

async function saveOcrResult({ imageId, aiResult }) {
  const ocr = getOcrFromAIResult(aiResult);

  if (!ocr) {
    return null;
  }

  return prisma.ocrResult.create({
    data: {
      imageId,
      fullText: ocr.text || ocr.fullText || '',
      linesJson: ocr.lines || [],
      boxesJson: ocr.boxes || [],
      rawJson: ocr,
      confidence: toNumber(ocr.confidence, 0),
      success: Boolean(ocr.success),
    },
  });
}

async function saveFeatureVector({ imageId, aiResult }) {
  const featureVector = getFeatureVectorFromAIResult(aiResult);

  if (!featureVector) {
    return null;
  }

  return prisma.featureVector.create({
    data: {
      imageId,
      textProbs: featureVector.textProbs || featureVector.text_probs || {},
      imageProbs: featureVector.imageProbs || featureVector.image_probs || {},
      ruleScores: featureVector.ruleScores || featureVector.rule_scores || {},
      ocrMeta: featureVector.ocrMeta || featureVector.ocr_meta || {},
      layoutFeatures:
        featureVector.layoutFeatures ||
        featureVector.layout_features ||
        {},
    },
  });
}

async function savePatternEvidences({ patternId, evidences }) {
  if (!Array.isArray(evidences) || evidences.length === 0) {
    return [];
  }

  const created = [];

  for (const evidence of evidences) {
    if (!evidence.imageId) {
      continue;
    }

    const row = await prisma.patternEvidence.create({
      data: {
        patternId,
        imageId: evidence.imageId,
        flowOrder: toNumber(evidence.flowOrder || evidence.order, 1),
        note: evidence.note || null,
      },
    });

    created.push(row);
  }

  return created;
}

async function saveDetectedPatterns({ reportId, imageId, aiResult }) {
  const detectedPatterns = getDetectedPatternsFromAIResult(aiResult);

  if (!Array.isArray(detectedPatterns) || detectedPatterns.length === 0) {
    return [];
  }

  const created = [];

  for (const pattern of detectedPatterns) {
    const category = normalizePatternCategory(pattern.category);
    const patternTypeId = toNumber(pattern.patternTypeId || pattern.pattern_type_id, 0);

    if (!category) {
      console.warn('[DetectedPattern] 잘못된 category라 저장하지 않음:', pattern.category);
      continue;
    }

    if (patternTypeId < 1 || patternTypeId > 15) {
      console.warn('[DetectedPattern] 잘못된 patternTypeId라 저장하지 않음:', patternTypeId);
      continue;
    }

    const riskScore = toNumber(pattern.riskScore || pattern.risk_score, 0);

    const row = await prisma.detectedPattern.create({
      data: {
        reportId,
        imageId,
        category,
        patternTypeId,
        patternName: pattern.patternName || pattern.pattern_name || '미분류 유형',
        riskLevel: normalizeRiskLevel(pattern.riskLevel || pattern.risk_level, riskScore),
        riskScore,
        confidence: toNumber(pattern.confidence, 0),

        description: pattern.description || null,
        recommendation: pattern.recommendation || null,
        location: pattern.location || null,

        evidenceText: pattern.evidenceText || pattern.evidence_text || null,
        evidenceBoxesJson:
          pattern.evidenceBoxes ||
          pattern.evidence_boxes ||
          pattern.evidenceBoxesJson ||
          [],

        ruleId: pattern.ruleId || pattern.rule_id || null,
        ruleLabel: pattern.ruleLabel || pattern.rule_label || null,

        detectedBy: normalizeDetectedBy(pattern.detectedBy || pattern.detected_by),
      },
    });

    if (Array.isArray(pattern.evidences)) {
      await savePatternEvidences({
        patternId: row.id,
        evidences: pattern.evidences,
      });
    }

    created.push(row);
  }

  return created;
}

async function completeReport({ reportId, aiResult, startedAt }) {
  const detectedPatterns = getDetectedPatternsFromAIResult(aiResult);
  const riskScore = toNumber(aiResult?.risk_score ?? aiResult?.riskScore, 0);
  const category = normalizeReportCategory(aiResult?.category);
  const now = new Date();

  const analysisMs = startedAt
    ? now.getTime() - startedAt.getTime()
    : null;

  return prisma.report.update({
    where: {
      id: reportId,
    },
    data: {
      status: 'COMPLETED',
      overallCategory: category,
      overallRiskLevel: mapRiskLevelByScore(riskScore),
      overallRiskScore: riskScore,
      totalDetected: detectedPatterns.length,
      confidence: toNumber(aiResult?.confidence, 0),
      summary:
        aiResult?.summary ||
        `총 ${detectedPatterns.length}건의 다크패턴 의심 요소가 탐지되었습니다.`,
      suggestionsJson: aiResult?.suggestions || [],
      analyzedAt: now,
      analysisMs,
    },
  });
}

async function failReport({ reportId, error }) {
  return prisma.report.update({
    where: {
      id: reportId,
    },
    data: {
      status: 'FAILED',
      summary: error?.message || '분석 중 오류가 발생했습니다.',
    },
  });
}

async function findReportForResponse(reportId) {
  return prisma.report.findUnique({
    where: {
      id: reportId,
    },
    include: {
      images: {
        include: {
          ocrResult: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      detectedPatterns: {
        include: {
          patternType: true,
          evidences: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

module.exports = {
  createProcessingReport,
  createReportImage,
  saveOcrResult,
  saveFeatureVector,
  saveDetectedPatterns,
  completeReport,
  failReport,
  findReportForResponse,

  // 테스트나 다른 service에서 재사용 가능하도록 export
  mapRiskLevelByScore,
  normalizeReportCategory,
  normalizePatternCategory,
};