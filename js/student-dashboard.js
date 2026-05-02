let studentProfile = null;
let progressData = null;
let projectMeta = [];
let gsdcMeta = null;

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("🚀 Dashboard loading...");

    studentProfile = await requireAuth("student");
    if (!studentProfile) return;

    console.log("✅ User:", studentProfile);

    document.getElementById("studentName").textContent =
      studentProfile.displayName || "Student";

    document.getElementById("topbarUser").textContent =
      `${studentProfile.displayName || "User"} · ${studentProfile.uid}`;

    // ✅ LOAD DATA FILES
    const [projRes, gsdcRes] = await Promise.all([
      fetch("data/projects-meta.json"),
      fetch("data/gsdc-modules.json")
    ]);

    projectMeta = await projRes.json();
    gsdcMeta = await gsdcRes.json();

    console.log("📦 Meta loaded");

    // ✅ LOAD USER PROGRESS
    progressData = await getOrSeedProgress(studentProfile.uid);

    console.log("📊 Progress:", progressData);

    // ✅ RENDER EVERYTHING
    renderProjects();
    renderGSDC();
    renderMocks();
    updateStats();

    setupTabs();

  } catch (err) {
    console.error("🔥 Dashboard error:", err);
  }
});


// ================= PROJECTS =================
function renderProjects() {
  const grid = document.getElementById("projectsGrid");
  grid.innerHTML = "";

  projectMeta.forEach(proj => {
    const status = progressData.projects?.[proj.id]?.status || "not_started";

    grid.innerHTML += `
      <div class="project-card">
        <h3>${proj.title}</h3>
        <p>${proj.description}</p>
        <div>${getStatusBadge(status)}</div>
      </div>
    `;
  });
}


// ================= GSDC =================
function renderGSDC() {
  const container = document.getElementById("modulesList");
  container.innerHTML = "";

  gsdcMeta.modules.forEach(mod => {
    const status = progressData.gsdc?.[mod.id]?.status || "not_started";

    container.innerHTML += `
      <div class="list-item">
        <div>
          <strong>${mod.title}</strong><br/>
          <small>Week ${mod.week} · ${mod.scheduledDate}</small>
        </div>
        <div>${getStatusBadge(status)}</div>
      </div>
    `;
  });
}


// ================= MOCK TESTS =================
function renderMocks() {
  const container = document.getElementById("mockList");
  container.innerHTML = "";

  gsdcMeta.mockTests.forEach(test => {
    const score = progressData.mockTests?.[test.id]?.score ?? null;

    container.innerHTML += `
      <div class="list-item">
        <div>
          <strong>${test.title}</strong><br/>
          <small>${test.questions} Q · ${test.duration} min</small>
        </div>
        <div>${scoreChip(score, test.questions)}</div>
      </div>
    `;
  });
}


// ================= STATS =================
function updateStats() {
  const projDone = Object.values(progressData.projects || {})
    .filter(p => p.status === "completed").length;

  const modDone = Object.values(progressData.gsdc || {})
    .filter(m => m.status === "completed").length;

  const mockScores = Object.values(progressData.mockTests || {})
    .map(m => m.score)
    .filter(s => s !== null);

  const mockDone = mockScores.length;

  const avgScore = mockDone
    ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockDone)
    : "—";

  document.getElementById("statProjects").textContent = `${projDone}/4`;
  document.getElementById("statModules").textContent = `${modDone}/11`;
  document.getElementById("statMocks").textContent = `${mockDone}/11`;
  document.getElementById("statAvgScore").textContent = avgScore;

  // overall %
  const total = 4 + 11 + 11;
  const done = projDone + modDone + mockDone;

  const pct = Math.round((done / total) * 100);

  document.getElementById("overallPct").textContent = `${pct}% complete`;
  document.getElementById("overallBar").style.width = `${pct}%`;
}


// ================= TABS =================
function setupTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });
}


// ================= LOGOUT =================
function logout() {
  firebase.auth().signOut().then(() => {
    window.location.replace("index.html");
  });
}