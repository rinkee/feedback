export default function SettingsPage() {
  return (
    <div className="container p-4 mx-auto">
      <h1 className="mb-4 text-2xl font-bold">설정</h1>
      <p>애플리케이션 관련 설정을 관리하는 페이지입니다.</p>
      {/* TODO: Add settings options here */}
      <div className="mt-8 space-y-6">
        <div>
          <h2 className="mb-2 text-xl font-semibold">알림 설정</h2>
          <div className="p-4 bg-gray-100 rounded-md">
            <label htmlFor="emailNotifications" className="flex items-center">
              <input type="checkbox" id="emailNotifications" name="emailNotifications" className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
              <span className="ml-2 text-sm text-gray-700">새로운 피드백 이메일 알림 받기</span>
            </label>
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-xl font-semibold">계정 정보</h2>
          <div className="p-4 bg-gray-100 rounded-md">
            <p className="text-sm text-gray-700">이메일: user@example.com</p>
            <button className="px-3 py-1 mt-2 text-sm text-white bg-blue-500 rounded hover:bg-blue-600">
              비밀번호 변경
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
