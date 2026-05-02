// js/faculty-dashboard.js
(async () => {
  const user = await requireAuth("faculty");

  if (!user) return;

  console.log("Faculty logged in:", user);

  // your existing dashboard code here
})();
let facultyProfile = null;
let allStudentRows = [];

document.addEventListener("DOMContentLoaded", async () => {
  facultyProfile = await requireAuth("faculty");

  qs("#facultyName").textContent  = facultyProfile.displayName;
  qs("#topbarUser").textContent   = `${facultyProfile.displayName} · ${facultyProfile.userId}`;

  await loadFacultyData();
  bindSearch();
});

async function loadFacultyData() {
  // Get all student users
  const usersSnap = await db.collection("users")
    .where("role", "==", "student")
    .get();

  // Get all progress docs
  const progressSnap = await db.collection("progress").get();
  const progressMap = {};
  progressSnap.forEach(doc => progressMap[doc.id] = doc.data());

  let totalDone = 0;
  let totalMockAttempts = 0;
  let totalMockPassed = 0;

  allStudentRows = [];

  usersSnap.forEach(doc => {
    const u = doc.data();
    const p = progressMap[u.userId] || { projects:{}, mockTests:{} };

    const statuses = ["P1","P2","P3","P4"].map(id => p.projects?.[id]?.status || "not_started");
    const completedCount = statuses.filter(s => s === "completed").length;

    const mockScores = Object.values(p.mockTests || {})
      .filter(m => m.score !== null && m.score !== undefined)
      .map(m => m.score);
    const mockPassed = Object.values(p.mockTests || {})
      .filter(m => m.passed === true).length;
    const avgMock = mockScores.length
      ? Math.round(mockScores.reduce((a,b) => a+b, 0) / mockScores.length)
      : null;

    totalDone        += completedCount;
    totalMockAttempts += mockScores.length;
    totalMockPassed   += mockPassed;

    allStudentRows.push({ u, statuses, completedCount, avgMock, mockAttempts: mockScores.length });
  });

  // Stat cards
  qs("#statStudents").textContent  = usersSnap.size;
  qs("#statTotalDone").textContent = totalDone;
  qs("#statMocks").textContent     = totalMockAttempts;
  qs("#statPassed").textContent    = totalMockPassed;

  renderTable(allStudentRows);
}

function renderTable(rows) {
  const tbody = qs("#facultyTableBody");

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:#64748b;">
      No student records found. Check Firestore users collection.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(({ u, statuses, completedCount, avgMock }) => `
    <tr>
      <td><code style="font-size:.78rem;background:#f1f5f9;padding:2px 6px;border-radius:4px;">${u.userId}</code></td>
      <td style="font-weight:600;">${u.displayName}</td>
      ${statuses.map(s => `<td>${getStatusBadge(s)}</td>`).join("")}
      <td style="font-weight:700;text-align:center;">
        <span style="color:${completedCount===4?"#16a34a":completedCount>0?"#2563eb":"#94a3b8"}">
          ${completedCount}/4
        </span>
      </td>
      <td style="text-align:center;">${scoreChip(avgMock)}</td>
      <td>
        <a href="student-detail.html?id=${u.userId}"
          style="font-size:.75rem;color:#2563eb;text-decoration:none;font-weight:600;">
          View →
        </a>
      </td>
    </tr>
  `).join("");
}

function bindSearch() {
  qs("#searchInput").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderTable(allStudentRows);
      return;
    }
    const filtered = allStudentRows.filter(({ u }) =>
      u.displayName.toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q)
    );
    renderTable(filtered);
  });
}