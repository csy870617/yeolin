// app.js - 인앱브라우저 호환성 및 알림 메시지 수정 적용

import * as Utils from './utils.js';
import * as Core from './core.js';
import * as Church from './church.js';

document.addEventListener('DOMContentLoaded', () => {

  // 인앱브라우저 터치 활성화를 위한 더미 리스너
  document.addEventListener('touchstart', function() {}, {passive: true});

  function scrollToTop() {
    window.scrollTo(0, 0);
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  }

  /* =========================================
     1. DOM 요소 캐싱
     ========================================= */
  const dom = {
    sections: {
      intro: document.getElementById("intro-section"),
      test: document.getElementById("test-section"),
      result: document.getElementById("result-section"),
      church: document.getElementById("church-section")
    },
    btns: {
      start: document.getElementById("start-btn"),
      back: document.getElementById("back-btn"),
      skip: document.getElementById("skip-btn"),
      restart: document.getElementById("restart-btn"),
      share: document.getElementById("share-btn"),
      goResult: document.getElementById("go-result-btn"),
      bibleToggle: document.getElementById("bible-toggle-btn"),
      todayVerse: document.getElementById("today-verse-btn"),
      church: document.getElementById("church-btn"),
      churchMainClose: document.getElementById("church-main-close-btn"), 
      memberSave: document.getElementById("member-save-btn"),
      churchSummary: document.getElementById("church-summary-btn"),
      churchAnalysis: document.getElementById("church-analysis-btn"), 
      inviteBottom: document.getElementById("invite-btn-bottom"),
      churchCopy: document.getElementById("church-copy-btn"),
      fontUp: document.getElementById("font-up"),
      fontDown: document.getElementById("font-down"),
      fontReset: document.getElementById("font-reset"),
      
      groupCreate: document.getElementById("group-create-btn"),
      groupLogin: document.getElementById("group-login-btn"),
      groupAuthClose: document.getElementById("church-auth-close-btn")
    },
    progress: {
      label: document.getElementById("progress-label"),
      fill: document.getElementById("progress-fill")
    },
    question: {
      code: document.getElementById("question-code"),
      text: document.getElementById("question-text"),
      inputs: document.getElementById("scale-inputs")
    },
    result: {
      code: document.getElementById("result-code"),
      name: document.getElementById("result-name"),
      summary: document.getElementById("result-summary"),
      badges: document.getElementById("result-badges"),
      features: document.getElementById("result-features"),
      growth: document.getElementById("result-growth"),
      strength: document.getElementById("result-strength"),
      weakness: document.getElementById("result-weakness"),
      warning: document.getElementById("result-warning"),
      ministries: document.getElementById("result-ministries"),
      axis: document.getElementById("axis-upgraded"),
      detail: document.getElementById("detail-score-list"),
      matchTop2: document.getElementById("match-top2"),
      matchOpposite: document.getElementById("match-opposite"),
      otherTypes: document.getElementById("other-types-grid")
    },
    bible: {
      charEl: document.getElementById("bible-character"),
      verseEl: document.getElementById("bible-verse"),
      box: document.getElementById("bible-box")
    },
    character: {
      emoji: document.getElementById("character-emoji"),
      title: document.getElementById("character-title"),
      text: document.getElementById("character-text")
    },
    verse: {
      box: document.getElementById("today-verse-box"),
      ref: document.getElementById("today-verse-box-ref"),
      text: document.getElementById("today-verse-box-text"),
      apply: document.getElementById("today-verse-box-apply")
    },
    inputs: {
      memberName: document.getElementById("member-name-input"),
      memberChurch: document.getElementById("member-church-input"),
      memberPw: document.getElementById("member-password-input"),
      viewChurch: document.getElementById("view-church-input"),
      viewPw: document.getElementById("view-password-input"),
      setupChurch: document.getElementById("setup-church-input"),
      setupPw: document.getElementById("setup-password-input"),
      autoLogin: document.getElementById("auto-login-check") 
    },
    churchList: document.getElementById("church-result-list"),
    churchAnalysisResult: document.getElementById("church-analysis-result"),
    churchCommunityArea: document.getElementById("church-community-area"),
    churchAfterActions: document.getElementById("church-after-actions"),
    churchAuthCard: document.getElementById("church-auth-card"),
    churchMainContent: document.getElementById("church-main-content")
  };

  let currentIndex = 0;
  let questions = []; 
  const answers = {};
  let myResultType = null;
  let currentViewType = null;
  let currentChurchMembers = []; 

  Core.initFontControl(dom);

  /* =========================================
     2. 브라우저 뒤로가기(popstate) 핸들링
     ========================================= */
  window.addEventListener('popstate', (event) => {
    if (!dom.sections.test.classList.contains("hidden")) {
      if (currentIndex > 0) {
        currentIndex--;
        Core.renderQuestion(dom, questions, currentIndex, answers, goNextOrResult);
        history.pushState({ page: "test" }, "", "#test");
      } else {
        dom.sections.test.classList.add("hidden");
        dom.sections.intro.classList.remove("hidden");
        scrollToTop(); 
      }
    } 
    else if (!dom.sections.result.classList.contains("hidden")) {
      dom.sections.result.classList.add("hidden");
      dom.sections.intro.classList.remove("hidden");
      scrollToTop();
    }
    else if (!dom.sections.church.classList.contains("hidden")) {
      dom.sections.church.classList.add("hidden");
      if (myResultType) {
        dom.sections.result.classList.remove("hidden");
      } else {
        dom.sections.intro.classList.remove("hidden");
      }
      scrollToTop();
    }
  });

  /* =========================================
     3. 로직 함수들
     ========================================= */
  function goNextOrResult() {
    if (currentIndex < questions.length - 1) {
      history.pushState({ page: "test" }, "", "#test");
      currentIndex++;
      Core.renderQuestion(dom, questions, currentIndex, answers, goNextOrResult);
    } else {
      dom.sections.test.classList.add("hidden");
      dom.sections.result.classList.remove("hidden");
      scrollToTop(); 
      history.pushState({ page: "result" }, "", "#result");

      const { type, scores, axisScores } = Core.calculateResult(window.originalQuestions, answers);
      const resultData = { type, scores, axisScores, date: new Date().getTime() };
      localStorage.setItem('faith_result_v1', JSON.stringify(resultData));

      myResultType = type;
      currentViewType = type;

      Core.renderResultScreen(dom, type, scores, axisScores);
      buildOtherTypesGrid();
    }
  }

  function buildOtherTypesGrid() {
    if(!dom.result.otherTypes) return;
    if (typeof window.typeResults === 'undefined') return;

    dom.result.otherTypes.innerHTML = "";
    Object.keys(window.typeResults).sort().forEach(t => {
      const btn = document.createElement("button");
      btn.className = "btn-type";
      btn.dataset.type = t;
      btn.innerHTML = `<strong>${t}</strong>`;
      btn.addEventListener("click", () => {
        currentViewType = t;
        Core.renderResultScreen(dom, t, 
          { E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0 }, 
          { EI:0,SN:0,TF:0,JP:0 } 
        );
        scrollToTop(); 
        updateTypeButtonsActive();
      });
      dom.result.otherTypes.appendChild(btn);
    });
    updateTypeButtonsActive();
  }

  function updateTypeButtonsActive() {
    document.querySelectorAll(".btn-type").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.type === currentViewType);
    });
  }

  function proceedToGroup(cName, cPw) {
    dom.inputs.memberChurch.value = cName;
    dom.inputs.memberPw.value = cPw;
    dom.inputs.viewChurch.value = cName;
    dom.inputs.viewPw.value = cPw;

    if (dom.inputs.autoLogin && dom.inputs.autoLogin.checked) {
      localStorage.setItem('faith_church_name', cName);
      localStorage.setItem('faith_church_pw', cPw);
    } else {
      localStorage.removeItem('faith_church_name');
      localStorage.removeItem('faith_church_pw');
    }

    dom.churchAuthCard.classList.add("hidden");
    dom.churchMainContent.classList.remove("hidden");
    dom.churchCommunityArea.classList.add("hidden");
    
    scrollToTop(); 
  }

  /* =========================================
     4. 이벤트 리스너 설정
     ========================================= */

  if (dom.btns.groupCreate) {
    dom.btns.groupCreate.addEventListener("click", async () => {
      const cName = dom.inputs.setupChurch.value.trim();
      const cPw = dom.inputs.setupPw.value.trim();
      if (!cName || !cPw) return alert("그룹명과 비밀번호를 모두 입력해 주세요.");
      if (cName === cPw) return alert("비밀번호를 다르게 입력해주세요.");

      try {
        const { db, fs } = await Church.ensureFirebase();
        const docRef = fs.doc(db, "faith_churches", cName);
        const snap = await fs.getDoc(docRef);
        // [수정] 이미 존재할 때 안내 문구 변경
        if (snap.exists()) { 
          alert("이미 존재하는 그룹입니다.\n그룹명이나 비밀번호를 바꿔주세요."); 
          return; 
        }
        await fs.setDoc(docRef, { churchName: cName, password: cPw, createdAt: Date.now() });
        alert(`'${cName}' 그룹이 생성되었습니다!`);
        proceedToGroup(cName, cPw);
      } catch (e) { console.error(e); alert("오류: " + e.message); }
    });
  }

  if (dom.btns.groupLogin) {
    dom.btns.groupLogin.addEventListener("click", async () => {
      const cName = dom.inputs.setupChurch.value.trim();
      const cPw = dom.inputs.setupPw.value.trim();
      if (!cName || !cPw) return alert("그룹명과 비밀번호를 입력해 주세요.");
      try {
        const { db, fs } = await Church.ensureFirebase();
        const docRef = fs.doc(db, "faith_churches", cName);
        const snap = await fs.getDoc(docRef);
        if (!snap.exists()) { alert("존재하지 않는 그룹입니다."); return; }
        if (snap.data().password !== cPw) { alert("비밀번호가 틀렸습니다."); return; }
        proceedToGroup(cName, cPw);
      } catch (e) { console.error(e); alert("오류 발생"); }
    });
  }

  if (dom.btns.groupAuthClose) {
    dom.btns.groupAuthClose.addEventListener("click", () => {
      if (location.hash === "#church") history.back();
      else {
         dom.sections.church.classList.add("hidden");
         if (myResultType) dom.sections.result.classList.remove("hidden");
         else dom.sections.intro.classList.remove("hidden");
         scrollToTop();
      }
    });
  }

  if (dom.btns.start) {
    dom.btns.start.addEventListener("click", () => {
      history.pushState({ page: "test" }, "", "#test");
      localStorage.removeItem('faith_result_v1');
      if (typeof window.originalQuestions === 'undefined') { alert("데이터 로딩 중..."); return; }
      questions = Utils.shuffle(window.originalQuestions);
      for (let k in answers) delete answers[k];
      currentIndex = 0; myResultType = null; currentViewType = null;
      dom.verse.box.classList.add("hidden");
      dom.bible.box.classList.add("hidden");
      dom.sections.intro.classList.add("hidden");
      dom.sections.test.classList.remove("hidden");
      dom.sections.result.classList.add("hidden");
      scrollToTop(); 
      Core.renderQuestion(dom, questions, currentIndex, answers, goNextOrResult);
    });
  }

  if (dom.btns.back) dom.btns.back.addEventListener("click", () => history.back());
  if (dom.btns.skip) dom.btns.skip.addEventListener("click", goNextOrResult);

  if (dom.btns.restart) {
    dom.btns.restart.addEventListener("click", () => {
      if(confirm("초기화 하시겠습니까?")) {
        localStorage.removeItem('faith_result_v1');
        myResultType = null; currentViewType = null;
        dom.sections.result.classList.add("hidden");
        dom.sections.intro.classList.remove("hidden");
        scrollToTop(); 
        history.replaceState(null, "", " "); 
      }
    });
  }

  if (dom.btns.share) {
    dom.btns.share.addEventListener("click", async () => {
      const targetType = myResultType || currentViewType;
      if (!targetType) return alert("공유할 유형이 없습니다.");
      const baseUrl = "https://faiths.life/";
      const data = window.typeResults[targetType];
      const shareTitle = "FAITH MBTI 신앙 유형 테스트";
      const shareDesc = `나의 유형은 ${targetType} (${data.nameKo}) 입니다.`;
      
      if (typeof Kakao !== "undefined" && Kakao.isInitialized && Kakao.isInitialized()) {
        try {
          Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: shareTitle,
              description: shareDesc,
              imageUrl: "https://csy870617.github.io/faith-mbti/images/thumbnail.jpg",
              link: { mobileWebUrl: baseUrl, webUrl: baseUrl },
            },
            buttons: [{ title: "테스트 하러가기", link: { mobileWebUrl: baseUrl, webUrl: baseUrl } }]
          });
          return;
        } catch (e) { console.error(e); }
      }
      if (navigator.share) { try { await navigator.share({ title: shareTitle, text: shareDesc, url: baseUrl }); return; } catch(e) {} }
      const success = await Utils.copyToClipboard(`${shareTitle}\n${shareDesc}\n${baseUrl}`);
      alert(success ? "링크가 복사되었습니다." : "실패했습니다.");
    });
  }

  if (dom.btns.church && dom.sections.church) {
    dom.btns.church.addEventListener("click", () => {
      history.pushState({ page: "church" }, "", "#church");
      dom.sections.intro.classList.add("hidden");
      dom.sections.test.classList.add("hidden");
      dom.sections.result.classList.add("hidden");
      dom.sections.church.classList.remove("hidden");
      scrollToTop(); 
      dom.churchAuthCard.classList.remove("hidden");
      dom.churchMainContent.classList.add("hidden");
    });
  }

  if (dom.btns.churchMainClose) {
    dom.btns.churchMainClose.addEventListener("click", () => {
      if (location.hash === "#church") history.back();
      else {
         dom.sections.church.classList.add("hidden");
         if (myResultType) dom.sections.result.classList.remove("hidden");
         else dom.sections.intro.classList.remove("hidden");
         scrollToTop();
      }
    });
  }

  if (dom.btns.memberSave) {
    dom.btns.memberSave.addEventListener("click", async () => {
      try {
        await Church.saveMyResultToChurch(
          dom.inputs.memberName.value, 
          dom.inputs.memberChurch.value, 
          dom.inputs.memberPw.value,
          currentViewType || myResultType
        );
        alert("저장되었습니다."); dom.inputs.memberName.value = "";
      } catch (e) { alert(e.message); }
    });
  }
  
  if (dom.btns.churchSummary) {
    dom.btns.churchSummary.addEventListener("click", async () => {
      if (!dom.churchCommunityArea.classList.contains("hidden")) {
        dom.churchCommunityArea.classList.add("hidden");
        return;
      }
      try {
        const { churchName, members } = await Church.loadChurchMembers(dom.inputs.viewChurch.value, dom.inputs.viewPw.value);
        currentChurchMembers = members;
        dom.churchCommunityArea.classList.remove("hidden");

        Church.renderChurchList(dom, churchName, members, async (btn) => {
           const pw = prompt("비밀번호를 입력해 주세요.");
           if (!pw) return;
           try {
             await Church.deleteChurchMember(btn.dataset.church, pw, btn.dataset.id);
             alert("삭제되었습니다.");
             const refreshed = await Church.loadChurchMembers(btn.dataset.church, pw);
             currentChurchMembers = refreshed.members;
             Church.renderChurchList(dom, refreshed.churchName, refreshed.members, (b) => btn.click()); 
           } catch (e) { alert(e.message); }
        });
        if (dom.churchAfterActions) dom.churchAfterActions.classList.remove("hidden");
      } catch (e) { 
        alert(e.message); 
        dom.churchCommunityArea.classList.add("hidden");
      }
    });
  }

  if (dom.btns.churchAnalysis) {
    dom.btns.churchAnalysis.addEventListener("click", () => {
      Church.analyzeAndRenderCommunity(dom, currentChurchMembers);
    });
  }

  if (dom.btns.inviteBottom) {
    dom.btns.inviteBottom.addEventListener("click", async () => {
      const baseUrl = "https://faiths.life";
      const gName = dom.inputs.viewChurch.value.trim() || "우리교회";
      if (typeof Kakao !== "undefined" && Kakao.isInitialized && Kakao.isInitialized()) {
        try {
          Kakao.Share.sendDefault({
            objectType: "feed",
            content: { title: `${gName} 신앙 유형 모임 초대`, description: "함께 검사하고 결과를 나눠보세요!", imageUrl: "https://csy870617.github.io/faith-mbti/images/thumbnail.jpg", link: { mobileWebUrl: baseUrl, webUrl: baseUrl } },
            buttons: [{ title: "참여하기", link: { mobileWebUrl: baseUrl, webUrl: baseUrl } }]
          });
          return; 
        } catch (e) {}
      }
      if (navigator.share) { try { await navigator.share({ title: `${gName} 초대`, text: "함께해요!", url: baseUrl }); return; } catch(e) {} }
      const success = await Utils.copyToClipboard(`${gName} 초대\n${baseUrl}`);
      alert(success ? "초대 링크가 복사되었습니다." : "복사 실패");
    });
  }

  if (dom.btns.churchCopy) {
    dom.btns.churchCopy.addEventListener("click", async () => {
      const members = currentChurchMembers;
      if (!members || !members.length) return alert("데이터가 없습니다.");
      let body = "";
      members.forEach(m => {
        const tData = (typeof window.typeResults !== 'undefined') ? window.typeResults[m.type] : null;
        body += `이름: ${m.name}\n유형: ${m.type}\n설명: ${tData ? tData.strengthShort : (m.shortText || "")}\n\n`;
      });
      const success = await Utils.copyToClipboard(`우리교회 결과\n\n${body}`);
      alert(success ? "결과가 복사되었습니다." : "복사 실패");
    });
  }

  if (dom.btns.todayVerse) {
    dom.btns.todayVerse.addEventListener("click", () => {
      const type = currentViewType || myResultType;
      if (!type) return;
      const data = window.typeResults[type];
      dom.verse.ref.textContent = data.verseRef;
      dom.verse.text.textContent = data.verseText;
      dom.verse.apply.textContent = data.verseApply || "";
      dom.verse.box.classList.toggle("hidden");
    });
  }
  
  if (dom.btns.bibleToggle) {
    dom.btns.bibleToggle.addEventListener("click", () => {
      const isHidden = dom.bible.box.classList.contains("hidden");
      dom.bible.box.classList.toggle("hidden");
      dom.btns.bibleToggle.textContent = isHidden ? "📖 성경 인물 닫기" : "📖 성경 인물 보기";
    });
  }
  
  if (dom.btns.goResult) {
    dom.btns.goResult.addEventListener("click", () => {
      localStorage.removeItem('faith_result_v1');
      myResultType = null; currentViewType = "ENFJ";
      dom.sections.intro.classList.add("hidden");
      dom.sections.test.classList.add("hidden");
      dom.sections.result.classList.remove("hidden");
      scrollToTop(); 
      history.pushState({ page: "result" }, "", "#result");
      const sampleScores = { E: 20, I: 5, S: 20, N: 5, T: 20, F: 5, J: 20, P: 5 };
      const sampleAxis = { EI: 15, SN: 15, TF: 15, JP: 15 };
      Core.renderResultScreen(dom, "ENFJ", sampleScores, sampleAxis);
      buildOtherTypesGrid();
    });
  }

  const savedData = localStorage.getItem('faith_result_v1');
  if (savedData) {
    try {
      const data = JSON.parse(savedData);
      if (data.type) {
        myResultType = data.type; currentViewType = data.type;
        dom.sections.intro.classList.add("hidden");
        dom.sections.test.classList.add("hidden");
        dom.sections.result.classList.remove("hidden");
        scrollToTop(); 
        if (location.hash !== "#result") history.replaceState({ page: "result" }, "", "#result");
        Core.renderResultScreen(dom, data.type, data.scores, data.axisScores);
        buildOtherTypesGrid();
      }
    } catch (e) { localStorage.removeItem('faith_result_v1'); }
  }

  const savedChurch = localStorage.getItem('faith_church_name');
  const savedPw = localStorage.getItem('faith_church_pw');
  if (savedChurch && savedPw) {
    if (dom.inputs.setupChurch) dom.inputs.setupChurch.value = savedChurch;
    if (dom.inputs.setupPw) dom.inputs.setupPw.value = savedPw;
    if (dom.inputs.autoLogin) dom.inputs.autoLogin.checked = true;
  }
});