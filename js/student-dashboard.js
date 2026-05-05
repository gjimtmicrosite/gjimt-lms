// ── Add this inside your existing DOMContentLoaded, after loadStudentProgress() ──
// Make sure gsdcMeta and progressDoc are already loaded (they are in the existing code)

let mockResultsMap = {};
let gsdcMeta = null;
async function loadMeta() {
  const res = await fetch("data/gsdc-modules.json");
  gsdcMeta = await res.json();
}
async function loadMockResults(email) {

  const db = firebase.firestore();

  const snapshot = await db.collection("mockResults")
    .where("email", "==", email)
    .get();

  mockResultsMap = {};

  snapshot.forEach(doc => {
    const data = doc.data();

    if (!data.testId) return;

    mockResultsMap[data.testId] = {
      score: data.score,
      passed: data.passed,
      attemptedAt: data.timestamp
    };
  });

  console.log("Mock Results Map:", mockResultsMap);

  // 🔥 IMPORTANT: ADD THESE TWO LINES
  renderMocks();        // updates cards
  updateMockStats();    // updates 0/11, avg, best
}
function updateMockStats() {

  const values = Object.values(mockResultsMap);

  const attempted = values.length;

  const passed = values.filter(v => v.passed === true).length;

  const scores = values
    .filter(v => typeof v.score === "number")
    .map(v => v.score);

  const avg = scores.length
    ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
    : 0;

  const best = scores.length
    ? Math.max(...scores)
    : 0;

  document.getElementById("smAttempted").innerText = `${attempted}/11`;
  document.getElementById("smPassed").innerText = passed;
  document.getElementById("smAvg").innerText = scores.length ? avg : "—";
  document.getElementById("smBest").innerText = scores.length ? best : "—";
}
function renderMocks() {

  if (!gsdcMeta || !gsdcMeta.mockTests) {
    console.warn("Meta not loaded yet");
    return;
  }

  const wrap = document.getElementById("mockGrid");
  const mockTests = gsdcMeta.mockTests;

  wrap.innerHTML = mockTests.map(mt => {

    const p = mockResultsMap[mt.id] || {};
    const hasScore = typeof p.score === "number";
    const isPassed = p.passed === true;

    const domainsHtml = (mt.domains || [])
      .map(d => `<span class="domain-tag">${d}</span>`)
      .join("");

    const topicsHtml = (mt.topics || [])
      .map(t => `<li>${t}</li>`)
      .join("");

    return `
      <div class="mock-card">

        <div class="mock-card-header">
          <div class="mock-card-title">${mt.title}</div>
          <span class="mock-date-chip">${mt.scheduledDate}</span>
        </div>

        <div>${domainsHtml}</div>

        <div>${mt.questions} Qs · ${mt.duration} Min</div>

        <div class="topics-body">
          <ul>${topicsHtml}</ul>
        </div>

        <div>
          ${hasScore
            ? (isPassed ? "✅" : "❌") + " " + p.score + "/40"
            : "Not Attempted"}
        </div>

        <div class="mock-actions">
          <a href="${mt.formUrl}" target="_blank" class="btn-open-test">
            ${hasScore ? "Retake →" : "Start Test →"}
          </a>
        </div>

      </div>
    `;
  }).join("");
}
document.addEventListener("DOMContentLoaded", async () => {

  await loadMeta();   // load JSON first

});
/* ===========================
   FIREBASE AUTH + LOAD DATA
=========================== */
firebase.auth().onAuthStateChanged(async (user) => {

  if (!user) return;

  const nameEl = document.getElementById("studentName");
  const topbarEl = document.getElementById("topbarUser");

  if (nameEl) nameEl.innerText = user.email;
  if (topbarEl) topbarEl.innerText = user.email;

  // 🔥 VERY IMPORTANT ORDER
  await loadMeta();               // 1. Load JSON
  await loadMockResults(user.email); // 2. Load Firestore

  renderMocks();                 // 3. Render
});
