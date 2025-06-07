const surveyId = "4b613182-ca1b-4c88-bf98-eeaeaad6d139";

async function testAIStatistics() {
  try {
    console.log("=== AI 통계 API 테스트 ===");
    console.log("설문 ID:", surveyId);

    const response = await fetch(
      `http://localhost:3000/api/surveys/${surveyId}/ai-statistics`
    );

    if (!response.ok) {
      console.error("❌ API 응답 오류:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("오류 내용:", errorText);
      return;
    }

    const data = await response.json();

    console.log("\n📊 API 응답 구조:");
    console.log("- success:", data.success);
    console.log("- statistics 배열 길이:", data.statistics?.length || 0);
    console.log("- live_analysis 존재:", !!data.live_analysis);
    console.log("- insights 존재:", !!data.insights);

    if (data.live_analysis) {
      console.log("\n🔍 Live Analysis 상세:");
      console.log("- NPS:", data.live_analysis.nps);
      console.log("- CSAT:", data.live_analysis.csat + "%");
      console.log("- 충성도 지수:", data.live_analysis.loyaltyIndex + "%");
      console.log("- 만족도 트렌드:", data.live_analysis.satisfactionTrend);
      console.log("- 성장 잠재력:", data.live_analysis.growthPotential);

      console.log("\n👥 고객 세그먼트:");
      data.live_analysis.customerSegments?.forEach((segment, i) => {
        console.log(
          `  ${i + 1}. ${segment.segment}: ${segment.count}명 (만족도: ${
            segment.avgSatisfaction
          }%)`
        );
      });

      console.log("\n📈 방문빈도 분석:");
      const vfa = data.live_analysis.visitFrequencyAnalysis;
      if (vfa) {
        console.log(`  - 신규 고객: ${vfa.newCustomers}%`);
        console.log(`  - 정기 고객: ${vfa.regularCustomers}%`);
        console.log(`  - 충성 고객: ${vfa.loyalCustomers}%`);
      }

      console.log("\n💪 강점 영역:");
      data.live_analysis.strengthAreas?.forEach((strength, i) => {
        console.log(`  ${i + 1}. ${strength}`);
      });

      console.log("\n⚠️ 개선 영역:");
      data.live_analysis.weaknessAreas?.forEach((weakness, i) => {
        console.log(`  ${i + 1}. ${weakness}`);
      });

      console.log("\n🎯 개선 우선순위:");
      data.live_analysis.improvementPriorities?.forEach((priority, i) => {
        console.log(`  ${i + 1}. ${priority}`);
      });

      console.log("\n🚀 전략적 제안:");
      data.live_analysis.strategicRecommendations?.forEach((rec, i) => {
        console.log(`  ${i + 1}. ${rec}`);
      });

      if (data.live_analysis.criticalIssues?.length > 0) {
        console.log("\n🚨 긴급 이슈:");
        data.live_analysis.criticalIssues.forEach((issue, i) => {
          console.log(`  ${i + 1}. ${issue}`);
        });
      }
    }

    if (data.insights) {
      console.log("\n📋 핵심 지표 요약:");
      console.log("- NPS:", data.insights.key_metrics?.nps);
      console.log("- CSAT:", data.insights.key_metrics?.csat);
      console.log("- 충성도:", data.insights.key_metrics?.loyalty);

      console.log("\n📊 액션 요약:");
      console.log(
        "- 긴급 이슈:",
        data.insights.action_summary?.critical + "개"
      );
      console.log(
        "- 개선 과제:",
        data.insights.action_summary?.priorities + "개"
      );
      console.log(
        "- 기회 요소:",
        data.insights.action_summary?.opportunities + "개"
      );
    }

    console.log("\n✅ AI 통계 분석 완료");
  } catch (error) {
    console.error("❌ 테스트 실행 오류:", error.message);
  }
}

testAIStatistics();
