require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function generate300Customers() {
  try {
    const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";
    const userId = "5e1f5903-b48d-4502-95cb-838df25fbf48";

    console.log("=== 300명 고객 및 응답 데이터 생성 시작 ===");

    // 1. 필수질문들과 일반질문들 조회
    const { data: questions, error: questionsError } = await supabase
      .from("questions")
      .select(
        `
        id,
        question_text,
        question_type,
        options,
        required_question_id,
        required_questions:required_question_id (
          id,
          category
        )
      `
      )
      .eq("survey_id", surveyId)
      .order("order_num");

    if (questionsError) {
      console.error("질문 조회 오류:", questionsError);
      return;
    }

    console.log(`총 ${questions.length}개 질문 확인`);

    // 필수질문과 일반질문 분리
    const requiredQuestions = questions.filter((q) => q.required_question_id);
    const generalQuestions = questions.filter((q) => !q.required_question_id);

    console.log(
      `필수질문: ${requiredQuestions.length}개, 일반질문: ${generalQuestions.length}개`
    );

    // 2. 기존 고객 수 확인
    const { data: existingCustomers, error: existingError } = await supabase
      .from("customer_info")
      .select("id")
      .limit(1000);

    if (existingError) {
      console.error("기존 고객 조회 오류:", existingError);
      return;
    }

    console.log(`기존 고객 수: ${existingCustomers.length}명`);

    // 3. 신규 고객 생성 (200명 추가 = 총 300명)
    const names = [
      "김민지",
      "박지유",
      "이서연",
      "최예린",
      "정수빈",
      "조하늘",
      "윤채영",
      "한소희",
      "임나연",
      "송가은",
    ];
    const ageGroups = ["20-25", "26-30", "31-35"];
    const genders = ["female", "male"];

    const needNewCustomers = Math.max(0, 300 - existingCustomers.length);

    if (needNewCustomers > 0) {
      console.log(`${needNewCustomers}명의 신규 고객 생성 중...`);

      const newCustomers = [];
      for (let i = 0; i < needNewCustomers; i++) {
        newCustomers.push({
          name:
            names[Math.floor(Math.random() * names.length)] +
            `_${i + existingCustomers.length + 1}`,
          age_group: ageGroups[Math.floor(Math.random() * ageGroups.length)],
          gender: Math.random() > 0.3 ? "female" : "male", // 20대 여대생 타겟이므로 여성 비율 높게
          phone: `010${String(Math.floor(Math.random() * 100000000)).padStart(
            8,
            "0"
          )}`,
          survey_id: surveyId,
          user_id: userId,
        });
      }

      // 배치로 고객 생성 (50명씩)
      for (let i = 0; i < newCustomers.length; i += 50) {
        const batch = newCustomers.slice(i, i + 50);
        const { data: createdCustomers, error: createError } = await supabase
          .from("customer_info")
          .insert(batch)
          .select("id, name");

        if (createError) {
          console.error(
            `고객 생성 오류 (배치 ${Math.floor(i / 50) + 1}):`,
            createError
          );
          continue;
        }

        console.log(
          `${createdCustomers.length}명 고객 생성 완료 (배치 ${
            Math.floor(i / 50) + 1
          })`
        );
      }
    }

    // 4. 모든 고객 다시 조회
    const { data: allCustomers, error: allCustomersError } = await supabase
      .from("customer_info")
      .select("id, name, age_group, gender");

    if (allCustomersError) {
      console.error("전체 고객 조회 오류:", allCustomersError);
      return;
    }

    console.log(`총 고객 수: ${allCustomers.length}명`);

    // 5. 응답 생성 함수들
    function getRandomDateBetween(start, end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime())
      );
    }

    function generateRatingResponse() {
      // 4-5점 비율을 높여서 좋은 평가 많이 생성
      const rand = Math.random();
      if (rand < 0.5) return 5;
      if (rand < 0.8) return 4;
      if (rand < 0.95) return 3;
      if (rand < 0.99) return 2;
      return 1;
    }

    function generateVisitFrequencyChoice() {
      // 방문빈도 선택지 분산
      const choices = [
        "choice_1",
        "choice_2",
        "choice_3",
        "choice_4",
        "choice_5",
        "choice_6",
      ];
      const weights = [0.1, 0.2, 0.3, 0.25, 0.1, 0.05]; // 이번이 처음부터 거의 매일까지

      const rand = Math.random();
      let cumulative = 0;
      for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (rand < cumulative) {
          return choices[i];
        }
      }
      return choices[0];
    }

    // 6. 각 고객에 대해 응답 생성
    console.log("=== 설문 응답 생성 중 ===");
    let totalResponsesCreated = 0;

    for (let i = 0; i < allCustomers.length; i++) {
      const customer = allCustomers[i];
      const responseDate = getRandomDateBetween("2024-05-31", "2024-06-06");

      // 필수질문 응답 생성
      for (const question of requiredQuestions) {
        const category = question.required_questions?.category;

        let responseData = {
          survey_id: surveyId,
          question_id: question.id,
          customer_info_id: customer.id,
          user_id: userId,
          required_question_category: category,
          created_at: responseDate.toISOString(),
        };

        if (question.question_type === "rating") {
          responseData.rating = generateRatingResponse();
        } else if (
          question.question_type === "single_choice" &&
          category === "visit_frequency"
        ) {
          responseData.selected_option = generateVisitFrequencyChoice();
        }

        const { error: responseError } = await supabase
          .from("responses")
          .insert(responseData);

        if (responseError) {
          console.error(
            `응답 생성 오류 (고객 ${i + 1}, 질문 ${question.id}):`,
            responseError
          );
        } else {
          totalResponsesCreated++;
        }
      }

      // 일반질문 응답 생성 (50% 확률로)
      if (Math.random() < 0.5) {
        for (const question of generalQuestions) {
          let responseData = {
            survey_id: surveyId,
            question_id: question.id,
            customer_info_id: customer.id,
            user_id: userId,
            required_question_category: null,
            created_at: responseDate.toISOString(),
          };

          if (question.question_type === "rating") {
            responseData.rating = generateRatingResponse();
          } else if (question.question_type === "single_choice") {
            const choiceCount = question.options?.choice_ids?.length || 5;
            responseData.selected_option = `choice_${
              Math.floor(Math.random() * choiceCount) + 1
            }`;
          } else if (question.question_type === "multiple_choice") {
            // 1-3개의 선택지를 랜덤하게 선택
            const choiceCount = question.options?.choice_ids?.length || 7;
            const numChoices = Math.floor(Math.random() * 3) + 1;
            const selectedChoices = [];
            for (let j = 0; j < numChoices; j++) {
              selectedChoices.push(
                `choice_${Math.floor(Math.random() * choiceCount) + 1}`
              );
            }
            responseData.selected_option = selectedChoices.join(",");
          } else if (question.question_type === "text") {
            const textResponses = [
              "전체적으로 만족합니다",
              "맛있었어요",
              "분위기가 좋아요",
              "직원분들이 친절해요",
              "가격대비 훌륭해요",
              "재방문 의사 있어요",
              "깔끔하고 좋아요",
            ];
            responseData.response_text =
              textResponses[Math.floor(Math.random() * textResponses.length)];
          }

          const { error: responseError } = await supabase
            .from("responses")
            .insert(responseData);

          if (responseError) {
            console.error(`일반질문 응답 생성 오류:`, responseError);
          } else {
            totalResponsesCreated++;
          }
        }
      }

      if ((i + 1) % 50 === 0) {
        console.log(`${i + 1}명 고객 응답 생성 완료`);
      }
    }

    console.log(`\n=== 데이터 생성 완료 ===`);
    console.log(`총 생성된 응답 수: ${totalResponsesCreated}개`);
    console.log(`총 고객 수: ${allCustomers.length}명`);
  } catch (error) {
    console.error("전체 오류:", error);
  }
}

generate300Customers();
