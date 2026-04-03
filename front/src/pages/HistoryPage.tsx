import Card from '../components/common/Card';

const HistoryPage = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">진단 이력</h1>
      <Card>
        <p className="text-gray-500 text-center py-10">
          아직 진단 이력이 없습니다. 홈에서 분석을 시작해 보세요.
        </p>
      </Card>
    </div>
  );
};

export default HistoryPage;