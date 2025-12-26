// church.js
const CHURCH_COLLECTION = "faith_churches";
let _firebaseDb = null, _firebaseFsModule = null, _firebaseAuthModule = null;

// Firebase 초기화 및 익명 로그인
export async function ensureFirebase() {
  if (_firebaseDb && _firebaseFsModule && _firebaseAuthModule) {
    return { db: _firebaseDb, fs: _firebaseFsModule };
  }

  const appMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const fsMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const authMod = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");

  const app = appMod.initializeApp({
    apiKey: "AIzaSyDAigdc0C7zzzOySBTFb527eeAN3jInIfQ",
    authDomain: "faith-mbti.firebaseapp.com",
    projectId: "faith-mbti",
    storageBucket: "faith-mbti.firebasestorage.app",
    messagingSenderId: "1065834838710",
    appId: "1:1065834838710:web:33382f9a82f94d112e8417",
    measurementId: "G-RWMSVFRMRP"
  });

  const auth = authMod.getAuth(app);
  await authMod.signInAnonymously(auth);

  _firebaseDb = fsMod.getFirestore(app);
  _firebaseFsModule = fsMod;
  _firebaseAuthModule = authMod;

  return { db: _firebaseDb, fs: _firebaseFsModule };
}

/**
 * 고유 그룹 ID 생성 (그룹명과 비밀번호를 조합)
 * 띄어쓰기 하나라도 다르면 다른 ID가 생성됩니다.
 */
const getChurchId = (cName, pw) => `${cName}_${pw}`;

// 결과 저장 (중복 이름 체크 로직 포함)
export async function saveMyResultToChurch(name, churchName, password, targetType) {
  const n = name.trim();
  // 그룹명과 비밀번호는 공백을 포함한 원본 값을 사용합니다.
  const c = churchName; 
  const p = password;

  if (!n || !c || !p) throw new Error("모든 항목을 입력해 주세요.");
  if (!targetType) throw new Error("먼저 검사를 완료하거나, '다른 유형 보기'에서 내 유형을 선택해 주세요.");
  if (typeof window.typeResults === 'undefined') throw new Error("데이터를 로드할 수 없습니다.");

  const { db, fs } = await ensureFirebase();
  
  // 고유 ID 적용
  const churchId = getChurchId(c, p);
  const churchRef = fs.doc(db, CHURCH_COLLECTION, churchId);
  const snap = await fs.getDoc(churchRef);

  // 그룹이 없으면 새로 생성 (조합 ID이므로 snap이 없으면 완전히 새로운 그룹임)
  if (!snap.exists()) {
    await fs.setDoc(churchRef, { 
      churchName: c, 
      password: p, 
      createdAt: fs.serverTimestamp ? fs.serverTimestamp() : Date.now() 
    });
  }

  // 중복 이름 체크 로직
  const membersRef = fs.collection(churchRef, "members");
  const q = fs.query(membersRef, fs.where("name", "==", n));
  const querySnapshot = await fs.getDocs(q);

  if (!querySnapshot.empty) {
    throw new Error("이미 입력된 이름입니다.\n나를 표현하는 다른 이름을 입력해주세요.");
  }

  // 중복이 없다면 저장 진행
  const data = window.typeResults[targetType];
  await fs.addDoc(membersRef, {
    name: n, type: targetType, shortText: data.summary || data.nameKo || "",
    createdAt: fs.serverTimestamp ? fs.serverTimestamp() : Date.now()
  });
}

// 멤버 목록 불러오기
export async function loadChurchMembers(churchName, password) {
  const c = churchName, p = password;
  if (!c || !p) throw new Error("정보를 모두 입력해 주세요.");

  const { db, fs } = await ensureFirebase();
  const churchId = getChurchId(c, p);
  const churchRef = fs.doc(db, CHURCH_COLLECTION, churchId);
  const snap = await fs.getDoc(churchRef);

  if (!snap.exists()) throw new Error("등록된 교회가 없거나 비밀번호가 틀렸습니다.");

  const q = fs.query(fs.collection(churchRef, "members"), fs.orderBy("createdAt", "asc"));
  const membersSnap = await fs.getDocs(q);
  const membersData = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  return { churchName: snap.data().churchName || c, members: membersData };
}

// 멤버 삭제
export async function deleteChurchMember(churchName, password, memberId) {
  const { db, fs } = await ensureFirebase();
  const churchId = getChurchId(churchName, password);
  const churchRef = fs.doc(db, CHURCH_COLLECTION, churchId);
  const snap = await fs.getDoc(churchRef);
  
  if (!snap.exists()) throw new Error("권한이 없습니다.");
  
  await fs.deleteDoc(fs.doc(fs.collection(churchRef, "members"), memberId));
}

// 목록 렌더링
export function renderChurchList(dom, churchName, members, onDeleteClick) {
  if (!dom.churchList) return;
  if (!members || !members.length) {
    dom.churchList.innerHTML = `<div style="padding:20px; text-align:center; color:#94a3b8;">저장된 결과가 없습니다.</div>`;
    return;
  }
  const rows = members.map(m => {
    const typeData = (typeof window.typeResults !== 'undefined') ? window.typeResults[m.type] : null;
    const desc = typeData ? typeData.strengthShort : (m.shortText || "");
    return `
    <tr>
      <td style="font-weight:600;">${m.name || ""}</td>
      <td><span class="type-pill" style="margin:0; padding:2px 8px; font-size:0.75rem;">${m.type || ""}</span></td>
      <td style="font-size:0.85rem; color:#64748b;">${desc}</td>
      <td style="text-align:right;"><button class="btn-secondary member-delete-btn" style="padding:4px 8px; font-size:0.75rem;" data-id="${m.id}" data-church="${churchName}">삭제</button></td>
    </tr>`;
  }).join('');
    
  dom.churchList.innerHTML = `
    <div class="church-list-header">🏠 ${churchName} <span style="font-size:0.9rem; font-weight:400; color:#64748b; margin-left:auto;">${members.length}명</span></div>
    <div class="member-table-container">
      <table>
        <thead><tr><th>이름</th><th>유형</th><th>설명</th><th style="text-align:right;">관리</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;

  dom.churchList.querySelectorAll(".member-delete-btn").forEach(btn => {
    btn.addEventListener("click", () => onDeleteClick(btn));
  });
}

// 공동체 분석 렌더링
export function analyzeAndRenderCommunity(dom, members) {
  if (!members || members.length === 0) {
    alert("먼저 [공동체 유형 확인] 버튼을 눌러 데이터를 불러와 주세요.");
    return;
  }
  if (typeof window.typeResults === 'undefined') { alert("데이터 로드 중 오류가 발생했습니다."); return; }

  const total = members.length;
  const counts = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
  const typeCounts = {};

  members.forEach(m => {
    const t = m.type; 
    if (!t || t.length !== 4) return;
    counts[t[0]]++; counts[t[1]]++; counts[t[2]]++; counts[t[3]]++;
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  });

  let maxVal = 0;
  for (const v of Object.values(typeCounts)) if (v > maxVal) maxVal = v;
  const maxTypes = Object.entries(typeCounts).filter(([t, v]) => v === maxVal).map(([t]) => t);
  const maxTypeDisplay = maxTypes.join(", ");
  const isTie = maxTypes.length > 1;

  const domE = counts.E === counts.I ? "E/I" : (counts.E > counts.I ? "E" : "I");
  const domS = counts.S === counts.N ? "S/N" : (counts.S > counts.N ? "S" : "N");
  const domT = counts.T === counts.F ? "T/F" : (counts.T > counts.F ? "T" : "F");
  const domJ = counts.J === counts.P ? "J/P" : (counts.J > counts.P ? "J" : "P");
  const displayCode = `${domE} - ${domS} - ${domT} - ${domJ}`;

  const lookupCode = (counts.E >= counts.I ? "E" : "I") + (counts.S >= counts.N ? "S" : "N") + 
                     (counts.T >= counts.F ? "T" : "F") + (counts.J >= counts.P ? "J" : "P");

  const topTypeName = window.typeResults[lookupCode] ? window.typeResults[lookupCode].nameKo : lookupCode;
  const isHybrid = (counts.E === counts.I) || (counts.S === counts.N) || (counts.T === counts.F) || (counts.J === counts.P);
  const typeBadge = isHybrid ? '<span class="badge badge-balanced" style="font-size:0.75rem; margin-left:6px;">복합/균형</span>' : '';

  let html = `
    <div class="analysis-report-container">
      <div class="analysis-section-flat">
        <div class="analysis-header">📊 우리 공동체 영적 DNA</div>
        <div class="analysis-summary-grid">
          <div class="summary-item">
            <div class="summary-val">${total}명</div>
            <div class="summary-label">분석 인원</div>
          </div>
          <div class="summary-item">
            <div class="summary-val" style="font-size:${isTie ? '1rem' : '1.3rem'}">${maxTypeDisplay}</div>
            <div class="summary-label">최다 유형 (${maxVal}명)</div>
          </div>
        </div>
        <div class="insight-text">
          우리의 대표 성향은 <span class="insight-highlight">${displayCode}</span> 입니다.<br/>
          <div style="margin-top:6px; font-weight:700; color:#1e293b; font-size:1.05rem;">"${topTypeName}" ${typeBadge}</div>
          <div style="margin-top:10px; font-size:0.8rem; color:#94a3b8;">* 에너지 비율에 따른 전체 경향성입니다.</div>
        </div>
      </div>

      <div class="analysis-section-flat">
        <div class="analysis-header">⚖️ 에너지 균형</div>
        <div style="background:#f8fafc; padding:16px; border-radius:12px; border:1px solid #e2e8f0;">
          ${renderBarEnhanced("관계 에너지", "외향 E", counts.E, "내향 I", counts.I, total)}
          ${renderBarEnhanced("인식 스타일", "현실 S", counts.S, "이상 N", counts.N, total)}
          ${renderBarEnhanced("판단 기준", "이성 T", counts.T, "감성 F", counts.F, total)}
          ${renderBarEnhanced("생활 패턴", "계획 J", counts.J, "유연 P", counts.P, total)}
        </div>
      </div>

      <div class="analysis-section-flat">
        <div class="analysis-header">🗣️ 모임 스타일</div>
        <div class="content-box-flat">${getMeetingStyle(counts, total)}</div>
      </div>

      <div class="analysis-section-flat">
        <div class="analysis-header">💎 배려가 필요한 '숨은 보석'</div>
        <div class="content-box-flat" style="background:#fff7ed; border-color:#ffedd5;">${getMinorityCare(counts, total)}</div>
      </div>

      <div class="analysis-section-flat">
        <div class="analysis-header">🌱 성장 가이드</div>
        <div class="content-box-flat" style="background:#f0fdf4; border-color:#dcfce7;">${getDetailedGrowthGuide(counts, total)}</div>
      </div>
      <button id="close-analysis-btn" class="close-analysis-btn">분석 결과 닫기 ✖</button>
    </div>`;

  if (dom.churchAnalysisResult) {
    dom.churchAnalysisResult.innerHTML = html;
    dom.churchAnalysisResult.classList.remove("hidden");
    document.getElementById("close-analysis-btn").addEventListener("click", () => {
      dom.churchAnalysisResult.classList.add("hidden");
      dom.btns.churchSummary.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}

function renderBarEnhanced(title, leftLabel, leftVal, rightLabel, rightVal, total) {
  const leftPct = Math.round((leftVal / total) * 100);
  const rightPct = 100 - leftPct;
  const gap = Math.abs(leftPct - rightPct);
  let badgeHtml = "";
  if (leftVal === rightVal) badgeHtml = `<span class="balance-badge badge-balanced">완벽한 균형 ✨</span>`;
  else if (gap < 15) badgeHtml = `<span class="balance-badge badge-balanced">황금 밸런스 ⚖️</span>`;

  return `
    <div style="margin-bottom:16px;">
      <div class="analysis-label-row"><span>${title} ${badgeHtml}</span></div>
      <div class="analysis-bar-container">
        <div style="width:${leftPct}%; background:#f43f5e; height:100%; transition: width 1s;"></div>
        <div style="width:${rightPct}%; background:#3b82f6; height:100%; transition: width 1s;"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#6b7280; margin-top:4px;">
        <span>${leftLabel} <strong>${leftVal}명</strong> (${leftPct}%)</span>
        <span>${rightLabel} <strong>${rightVal}명</strong> (${rightPct}%)</span>
      </div>
    </div>`;
}

function getMeetingStyle(c, total) {
  let text = "";
  if (c.E === c.I) text += "✨ <strong>활력과 깊이의 균형:</strong> 역동적인 에너지와 차분한 묵상이 공존하는 이상적인 분위기입니다.<br/><br/>";
  else if (c.E > c.I) text += "🎤 <strong>활기차고 에너지가 넘쳐요:</strong> 누군가 먼저 말을 꺼내고 분위기를 주도합니다. 목소리 큰 사람 위주로 흘러가지 않도록 주의하세요.<br/><br/>";
  else text += "☕ <strong>차분하고 깊이가 있어요:</strong> 소그룹으로 깊게 나누는 것을 선호합니다. 침묵을 어색해하지 마세요.<br/><br/>";

  if (c.J === c.P) text += "🤝 <strong>계획과 유연함의 조화:</strong> 큰 틀은 지키되 상황에 맞춰 융통성을 발휘할 줄 압니다.";
  else if (c.J > c.P) text += "📅 <strong>계획대로 착착:</strong> 시작과 끝 시간이 명확하고 정해진 순서대로 진행되는 것을 좋아합니다.";
  else text += "🌊 <strong>그때그때 유연하게:</strong> 순서가 바뀌어도 즐겁게 받아들입니다. 마무리를 잘 챙겨주세요.";
  return text;
}

function getMinorityCare(c, total) {
  const minorities = [];
  const threshold = total * 0.4; 
  if (c.I < threshold && c.I > 0) minorities.push("🤫 <strong>내향형(I):</strong> 에너지가 높은 모임에서 기가 빨릴 수 있어요. 생각할 시간을 주세요.");
  if (c.E < threshold && c.E > 0) minorities.push("📣 <strong>외향형(E):</strong> 너무 차분하면 답답할 수 있어요. 에너지를 발산할 기회를 주세요.");
  if (c.S < threshold && c.S > 0) minorities.push("👀 <strong>현실형(S):</strong> 구체적인 적용점을 좋아해요.");
  if (c.N < threshold && c.N > 0) minorities.push("🌈 <strong>직관형(N):</strong> '우리 공동체의 꿈' 같은 깊은 주제를 던져주세요.");
  if (c.F < threshold && c.F > 0) minorities.push("💖 <strong>감정형(F):</strong> '서로의 마음'을 확인받고 싶어 해요.");
  if (c.T < threshold && c.T > 0) minorities.push("🤔 <strong>사고형(T):</strong> 논리적인 이유를 설명해 주세요.");

  if (minorities.length === 0) return "⚖️ <strong>치우침 없이 조화로워요!</strong><br/>다양성을 유지하며 서로 배우는 관계가 되세요.";
  return minorities.join("<br/><br/>");
}

function getDetailedGrowthGuide(c, total) {
  const guides = [];
  if (c.E === c.I) guides.push(`<div class="growth-item"><div class="growth-icon">⚖️</div><div><strong>소통의 균형:</strong> 말하기와 듣기의 비율이 좋습니다.</div></div>`);
  else if (c.E > c.I) guides.push(`<div class="growth-item"><div class="growth-icon">👂</div><div><strong>경청의 영성:</strong> 가끔은 '거룩한 침묵'의 시간을 가져보세요.</div></div>`);
  else guides.push(`<div class="growth-item"><div class="growth-icon">🔥</div><div><strong>표현의 용기:</strong> 은혜를 입 밖으로 꺼내어 나누는 용기를 내보세요.</div></div>`);

  if (c.S === c.N) guides.push(`<div class="growth-item"><div class="growth-icon">BRIDGE</div><div><strong>현실과 비전의 다리:</strong> 꿈꾸는 사람과 길을 만드는 사람이 함께 있어 든든합니다.</div></div>`);
  else if (c.S > c.N) guides.push(`<div class="growth-item"><div class="growth-icon">🔭</div><div><strong>거룩한 상상력:</strong> 당장의 문제 해결을 넘어 '큰 그림'을 꿈꿔보세요.</div></div>`);
  else guides.push(`<div class="growth-item"><div class="growth-icon">🧹</div><div><strong>거룩한 디테일:</strong> 꿈을 이루기 위해 오늘 해야 할 '작은 순종'을 놓치지 마세요.</div></div>`);

  if (c.T === c.F) guides.push(`<div class="growth-item"><div class="growth-icon">🤝</div><div><strong>머리와 가슴의 조화:</strong> 냉철한 판단과 따뜻한 공감이 어우러졌습니다.</div></div>`);
  else if (c.T > c.F) guides.push(`<div class="growth-item"><div class="growth-icon">💓</div><div><strong>공감의 온도:</strong> 정답을 전하기 전에 따뜻한 눈빛으로 마음을 녹여주세요.</div></div>`);
  else guides.push(`<div class="growth-item"><div class="growth-icon">⚖️</div><div><strong>분별의 지혜:</strong> 건강한 관계를 위해 '사랑 안에서 진리'를 말해보세요.</div></div>`);

  if (c.J === c.P) guides.push(`<div class="growth-item"><div class="growth-icon">⚓</div><div><strong>안정과 모험:</strong> 체계적인 안정감과 유연함이 모두 있습니다.</div></div>`);
  else if (c.J > c.P) guides.push(`<div class="growth-item"><div class="growth-icon">🕊️</div><div><strong>여백의 미:</strong> 계획대로 되지 않는 의외성을 기쁨으로 받아들여 보세요.</div></div>`);
  else guides.push(`<div class="growth-item"><div class="growth-icon">🧱</div><div><strong>질서의 능력:</strong> 약속 시간과 규칙 같은 작은 질서를 지킬 때 신뢰가 단단해집니다.</div></div>`);
  return guides.join("");
}
