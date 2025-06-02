export default function EditQuestionsPage() {
  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">질문 수정</h1>
      <p>가게 이용자에게 보여질 설문 질문을 관리하는 페이지입니다.</p>
      {/* TODO: Add form to edit questions here */}
      <div className="mt-8">
        <h2 className="mb-2 text-xl font-semibold">샘플 질문 목록</h2>
        <div className="p-4 bg-gray-100 rounded-md">
          <ul className="list-decimal list-inside">
            <li>음식의 맛은 어떠셨나요? (1-5점)</li>
            <li>서비스 만족도는 어떠셨나요? (1-5점)</li>
            <li>개선할 점이 있다면 알려주세요. (주관식)</li>
          </ul>
          <button className="px-4 py-2 mt-4 text-white bg-blue-500 rounded hover:bg-blue-600">
            새 질문 추가
          </button>
        </div>
      </div>
    </div>
  );
}
