/* =========================================
   블로그 전용 스크립트 (글자 크기 조절)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
  // 1. 저장된 폰트 설정 불러오기
  let currentFontScale = parseFloat(localStorage.getItem("faith_font_scale")) || 1.0;
  const root = document.documentElement;

  // 폰트 적용 함수
  function applyFontSize(scale) {
    // 소수점 오류 방지
    scale = Math.round(scale * 10) / 10;
    
    // 표준(1.0) = 120% (메인 앱과 동일 기준)
    const basePercent = 120; 
    const percent = Math.round(scale * basePercent);
    
    root.style.fontSize = `${percent}%`;
    localStorage.setItem("faith_font_scale", scale);
    currentFontScale = scale;
  }

  // 초기화 실행
  applyFontSize(currentFontScale);

  // 2. 버튼 이벤트 연결
  const btnUp = document.getElementById("font-up");
  const btnDown = document.getElementById("font-down");
  const btnReset = document.getElementById("font-reset");

  if (btnUp) {
    btnUp.addEventListener("click", () => {
      if (currentFontScale < 1.3) applyFontSize(currentFontScale + 0.1);
    });
  }

  if (btnDown) {
    btnDown.addEventListener("click", () => {
      if (currentFontScale > 0.7) applyFontSize(currentFontScale - 0.1);
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      applyFontSize(1.0);
    });
  }
});