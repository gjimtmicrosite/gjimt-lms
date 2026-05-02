let userProfile = null;
let projectMeta = null;
let projectId = null;
let projectProgress = null;

document.addEventListener("DOMContentLoaded", async () => {
  userProfile = await requireAuth();
  qs("#topbarUser").textContent = `${userProfile.displayName} · ${userProfile.userId}`;

  const params = new URLSearchParams(window.location.search);
  projectId = params.get("id") || "P1";

  const projects = await fetch("data/projects-meta.json").then(r => r.json());
  projectMeta = projects.find(p => p.id === projectId);

  if (!projectMeta) {
    qs("#projectRoot").innerHTML = `<div class="alert alert-danger">Invalid project ID.</div>`;
    return;
  }

  await loadProgress();
  renderProject();
  bindSubmission();
});

async function loadProgress() {
  const docRef = firebase.firestore().collection("progress").doc(userProfile.userId);
  const snap = await docRef.get();
  if (!snap.exists) return;
  projectProgress = snap.data().projects[projectId];
}

function renderProject() {
  qs("#projectTitle").textContent = `${projectMeta.id}. ${projectMeta.title}`;
  qs("#projectSubtitle").textContent = `${projectMeta.subtitle} · ${projectMeta.weeks} · ${projectMeta.totalHours} hours`;
  qs("#projectDesc").textContent = projectMeta.description;

  const manualDone = ["manual_submitted", "ai_unlocked", "completed"].includes(projectProgress.status);
  const aiUnlocked = ["ai_unlocked", "completed"].includes(projectProgress.status);
  const completed = projectProgress.status === "completed";

  qs("#manualTasks").innerHTML = projectMeta.manualTasks.map(t => `
    <li class="task-item">
      <input class="task-check" type="checkbox" disabled ${manualDone ? "checked" : ""}/>
      <div class="task-text">
        <strong>${t.title}</strong>
        <span>${t.detail}</span>
      </div>
    </li>
  `).join("");

  qs("#aiTasks").innerHTML = projectMeta.aiTasks.map(t => `
    <li class="task-item">
      <input class="task-check" type="checkbox" disabled ${completed ? "checked" : aiUnlocked ? "" : ""}/>
      <div class="task-text">
        <strong>${t.title}</strong>
        <span>${t.detail}</span>
      </div>
    </li>
  `).join("");

  qs("#toolTags").innerHTML = projectMeta.tools.map(t => `<span class="tool-tag">${t}</span>`).join("");
  qs("#deliverableText").textContent = projectMeta.deliverable;

  if (projectMeta.colabLink) {
    qs("#colabLinkWrap").innerHTML = `<a class="btn btn-outline btn-sm" target="_blank" href="${projectMeta.colabLink}">Open Colab Notebook</a>`;
  }

  qs("#manualStatus").innerHTML = getStatusBadge(projectProgress.status);

  if (aiUnlocked) {
    qs("#aiLockedPanel").style.display = "none";
    qs("#aiPanel").classList.add("active");
  } else {
    qs("#aiLockedPanel").style.display = "block";
  }
}

function bindSubmission() {
  qs("#submitManualBtn").addEventListener("click", () => submitPhase("manual"));
  qs("#submitAiBtn").addEventListener("click", () => submitPhase("ai"));
}

async function submitPhase(phase) {
  const input = phase === "manual" ? qs("#manualDriveLink") : qs("#aiDriveLink");
  const link = input.value.trim();
  if (!link.startsWith("http")) {
    alert("Please paste a valid Google Drive link.");
    return;
  }

  const progressRef = firebase.firestore().collection("progress").doc(userProfile.userId);
  const submissionRef = firebase.firestore().collection("submissions").doc();

  const updatePayload = {};
  if (phase === "manual") {
    updatePayload[`projects.${projectId}.status`] = "ai_unlocked";
    updatePayload[`projects.${projectId}.manualSubmittedAt`] = firebase.firestore.FieldValue.serverTimestamp();
    updatePayload[`projects.${projectId}.manualDriveLink`] = link;
  } else {
    updatePayload[`projects.${projectId}.status`] = "completed";
    updatePayload[`projects.${projectId}.completedAt`] = firebase.firestore.FieldValue.serverTimestamp();
  }
  updatePayload["lastUpdated"] = firebase.firestore.FieldValue.serverTimestamp();

  await progressRef.update(updatePayload);
  await submissionRef.set({
    userId: userProfile.userId,
    projectId,
    phase,
    driveLink: link,
    submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
    reviewed: false,
    reviewedBy: null,
    remarks: ""
  });

  alert(phase === "manual"
    ? "Manual phase submitted. AI Lab is now unlocked."
    : "AI phase submitted. Project marked complete.");

  location.reload();
}