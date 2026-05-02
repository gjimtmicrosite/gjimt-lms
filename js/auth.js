const auth = firebase.auth();
const db = firebase.firestore();

// ✅ Wait for Firebase auth state (clean)
function waitForAuthState() {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      unsubscribe();

      if (!user) {
        console.log("❌ No Firebase user");
        resolve(null);
        return;
      }

      try {
        const snap = await db.collection("users").doc(user.uid).get();

        if (!snap.exists) {
          console.log("❌ No Firestore profile");
          resolve({ user, profile: null });
          return;
        }

        resolve({
          user,
          profile: snap.data()
        });

      } catch (err) {
        console.error("🔥 Firestore error:", err);
        reject(err);
      }
    });
  });
}


// ✅ MAIN AUTH FUNCTION (NO LOOP, STABLE)
async function requireAuth(expectedRole = null) {

  const result = await waitForAuthState();

  // ❌ Not logged in
  if (!result) {
    window.location.replace("index.html");
    return null;
  }

  const { user, profile } = result;

  // ❌ No Firestore user
  if (!profile) {
    await auth.signOut();
    window.location.replace("index.html");
    return null;
  }

  const role = (profile.role || "").toLowerCase();

  // ❌ Wrong role
  if (expectedRole && role !== expectedRole.toLowerCase()) {
    window.location.replace(
      role === "faculty"
        ? "dashboard-faculty.html"
        : "dashboard-student.html"
    );
    return null;
  }

  console.log("✅ Auth success:", role);

  return {
    uid: user.uid,
    email: user.email,
    ...profile
  };
}


// ✅ LOGOUT
async function logout() {
  await auth.signOut();
  window.location.href = "index.html";
}


// ✅ IMPORTANT: CREATE OR GET PROGRESS (FIXES YOUR LOADING ISSUE)
async function getOrSeedProgress(userId) {

  const ref = db.collection("progress").doc(userId);
  const snap = await ref.get();

  if (snap.exists) {
    return snap.data();
  }

  console.log("🆕 Creating new progress...");

  const emptyProjects = {};
  ["P1","P2","P3","P4"].forEach(p => {
    emptyProjects[p] = {
      status: "not_started",
      score: null
    };
  });

  const emptyGsdc = {};
  for (let i = 1; i <= 11; i++) {
    emptyGsdc[`M${String(i).padStart(2,"0")}`] = {
      status: "not_started"
    };
  }

  const emptyMocks = {};
  for (let i = 1; i <= 11; i++) {
    emptyMocks[`MT${String(i).padStart(2,"0")}`] = {
      score: null
    };
  }

  const data = {
    projects: emptyProjects,
    gsdc: emptyGsdc,
    mockTests: emptyMocks
  };

  await ref.set(data);

  return data;
} 