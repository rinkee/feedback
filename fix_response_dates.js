require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixResponseDates() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

    console.log("=== 응답 날짜 수정 시작 ===");

    // 1. 2024년 응답들 조회
    const { data: oldResponses, error: fetchError } = await supabase
      .from("responses")
      .select("id, created_at")
      .eq("survey_id", surveyId)
      .gte("created_at", "2024-06-01T00:00:00.000Z")
      .lt("created_at", "2025-01-01T00:00:00.000Z")
      .order("created_at", { ascending: true });

    if (fetchError) {
      console.error("응답 조회 오류:", fetchError);
      return;
    }

    console.log(`2024년 응답 수: ${oldResponses.length}`);

    // 2. 날짜 매핑 생성 (2024.6.2~6.6 → 2025.5.30~6.6)
    const dateMapping = {
      "2024-06-02": "2025-05-30",
      "2024-06-03": "2025-05-31",
      "2024-06-04": "2025-06-01",
      "2024-06-05": "2025-06-02",
      "2024-06-06": "2025-06-03",
    };

    // 3. 각 응답의 날짜 업데이트
    let updateCount = 0;

    for (const response of oldResponses) {
      const oldDate = new Date(response.created_at);
      const oldDateStr = oldDate.toISOString().split("T")[0];

      if (dateMapping[oldDateStr]) {
        // 시간은 유지하고 날짜만 변경
        const timeStr = oldDate.toISOString().split("T")[1];
        const newDateTime = `${dateMapping[oldDateStr]}T${timeStr}`;

        const { error: updateError } = await supabase
          .from("responses")
          .update({ created_at: newDateTime })
          .eq("id", response.id);

        if (updateError) {
          console.error(`응답 ${response.id} 업데이트 오류:`, updateError);
        } else {
          updateCount++;
          if (updateCount % 100 === 0) {
            console.log(`${updateCount}개 응답 업데이트 완료...`);
          }
        }
      }
    }

    console.log(`총 ${updateCount}개 응답의 날짜가 업데이트되었습니다.`);

    // 4. 업데이트 결과 확인
    const { data: updatedResponses, error: verifyError } = await supabase
      .from("responses")
      .select("created_at")
      .eq("survey_id", surveyId)
      .gte("created_at", "2025-05-30T00:00:00.000Z")
      .order("created_at", { ascending: false });

    if (verifyError) {
      console.error("검증 조회 오류:", verifyError);
      return;
    }

    // 날짜별 분포 재확인
    const dateCount = {};
    updatedResponses.forEach((r) => {
      const date = new Date(r.created_at).toLocaleDateString("ko-KR");
      dateCount[date] = (dateCount[date] || 0) + 1;
    });

    console.log("\n업데이트 후 날짜별 응답 수:");
    Object.entries(dateCount)
      .sort()
      .forEach(([date, count]) => {
        console.log(`${date}: ${count}개`);
      });
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

fixResponseDates();
