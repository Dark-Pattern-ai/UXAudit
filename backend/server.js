const express = require('express');
const cors = require('cors');
const path = require('path');

//기존 utils/ocrEngine 의존성 때문에 임시 비활성화 파일 삭제해서 일단 주석처리
//const analyzeRouter = require('./routes/analyze');
const testAnalyzeRouter = require('./routes/analyze_v2');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 라우트 임시 비활성화
//app.use('/api', analyzeRouter);

// 새 구조 테스트 analyze 라우트 추가 되면 이걸로 교체(?) 아님 말고
app.use('/api', testAnalyzeRouter);
// 업로드 이미지 정적 제공
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 테스트
//app.use('/test', express.static(path.join(process.cwd(), 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: err.message || '서버 오류가 발생했습니다.',
  });
});

app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
});

module.exports = app;
