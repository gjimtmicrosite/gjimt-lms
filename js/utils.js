function qs(selector) {
  return document.querySelector(selector);
}

function safePercent(done, total) {
  return total ? Math.round((done / total) * 100) : 0;
}

function getStatusBadge(status) {
  const map = {
    not_started: "⬜ Not Started",
    in_progress: "🟡 In Progress",
    manual_submitted: "📝 Manual Done",
    ai_unlocked: "🤖 AI Unlocked",
    completed: "✅ Completed"
  };

  return `<span class="badge">${map[status] || status}</span>`;
}

function scoreChip(score, total) {
  if (score === null) {
    return `<span class="badge">Not Attempted</span>`;
  }

  return `<span class="badge">${score}/${total}</span>`;
}