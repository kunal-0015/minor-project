/* frontend/assets/js/app.js
   Shared frontend logic:
   - Render header/sidebar/footer
   - Handle mobile sidebar toggle
   - Simple form validation + mock "login/register"
   - Store mock session/resume/candidate in localStorage
   - Generate mock verification + job matching
*/

(function () {
  const LS = {
    session: "sd_session",
    resume: "sd_resume",
    candidate: "sd_candidate",
    verification: "sd_verification",
    lastCandidateId: "sd_lastCandidateId"
  };

  const ROUTES = {
    studentDashboard: "student-dashboard.html",
    recruiterDashboard: "recruiter-dashboard.html",
    studentLogin: "student-login.html",
    recruiterLogin: "recruiter-login.html",
    candidateDetails: "candidate-details.html",
    resumeUpload: "resume-upload.html",
    verifyResume: "verify-resume.html",
    jobMatch: "job-match-result.html"
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }
  function getBodyDataset() {
    return document.body ? document.body.dataset : {};
  }
  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(LS.session) || "null");
    } catch {
      return null;
    }
  }
  function setSession(obj) {
    localStorage.setItem(LS.session, JSON.stringify(obj));
  }

  function showToast({ title, body, type }) {
    const wrap = $("#toast-wrap") || createToastWrap();
    const el = document.createElement("div");
    el.className = `toast ${type ? `toast--${type}` : ""}`.trim();
    el.innerHTML = `
      <div class="t-title">${escapeHtml(title || "Info")}</div>
      <div class="t-body">${escapeHtml(body || "")}</div>
    `;
    wrap.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(6px)";
      el.style.transition = "opacity .18s ease, transform .18s ease";
      setTimeout(() => el.remove(), 200);
    }, 3200);
  }

  function createToastWrap() {
    const wrap = document.createElement("div");
    wrap.id = "toast-wrap";
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
    return wrap;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return map[c] || c;
    });
  }

  function setFieldError(inputEl, message) {
    // We use data-error-for="<fieldName>" elements under each input.
    const key = inputEl.name || inputEl.id;
    if (!key) return;
    const errEl = $(`[data-error-for="${cssEscape(key)}"]`);
    if (!errEl) return;
    errEl.textContent = message || "";
    if (message) inputEl.focus();
  }

  // CSS.escape is not supported everywhere; simple fallback:
  function cssEscape(s) {
    try {
      if (window.CSS && CSS.escape) return CSS.escape(s);
    } catch {}
    return String(s).replace(/["\\]/g, "\\$&");
  }

  function clearFormErrors(form) {
    $all(".field-error[data-error-for]", form).forEach((el) => (el.textContent = ""));
    $all("input, select, textarea", form).forEach((el) => {
      el.classList.remove("input-error");
    });
    const msg = $(".form-message", form);
    if (msg) msg.className = "form-message";
    if (msg) msg.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function getProtectedMode() {
    return getBodyDataset().protect || "";
  }

  function getPageId() {
    return getBodyDataset().page || "";
  }

  function roleFromDatasetOrSession() {
    const ds = getBodyDataset();
    if (ds.role) return ds.role;
    const session = getSession();
    return session && session.role ? session.role : null;
  }

  function navLinksForRole(role) {
    if (role === "recruiter") {
      return [
        { label: "Dashboard", href: ROUTES.recruiterDashboard },
        { label: "Candidate Details", href: ROUTES.candidateDetails },
        { label: "Verify Resume", href: ROUTES.verifyResume },
        { label: "Job Match Result", href: ROUTES.jobMatch }
      ];
    }
    // Default to student menu
    return [
      { label: "Dashboard", href: ROUTES.studentDashboard },
      { label: "Upload Resume", href: ROUTES.resumeUpload },
      { label: "Candidate Details", href: ROUTES.candidateDetails },
      { label: "Verify Resume", href: ROUTES.verifyResume },
      { label: "Job Match Result", href: ROUTES.jobMatch }
    ];
  }

  function pageTitleForRole(role) {
    if (role === "recruiter") return "Recruiter Portal";
    if (role === "student") return "Student Portal";
    return "Portal";
  }

  function injectHeaderFooter() {
    const headerMount = $("#app-header");
    if (headerMount) {
      const session = getSession();
      const role = roleFromDatasetOrSession();
      const name = session && session.name ? session.name : "";
      headerMount.innerHTML = `
        <div class="container nav">
          <div class="nav-brand" role="banner" aria-label="Brand">
            <div class="logo" aria-hidden="true"></div>
            <div>
              <div style="font-size: 14px; color: rgba(234,241,255,.78); font-weight: 800;">Skill Verification</div>
              <div style="font-size: 16px;">Job Matching Platform</div>
            </div>
          </div>

          <div class="nav-links" aria-label="Top navigation">
            ${role ? `<span class="badge"><span class="badge-dot"></span> ${escapeHtml(role.toUpperCase())}${name ? `: ${escapeHtml(name)}` : ""}</span>` : ""}
            <a class="btn" href="index.html" style="padding: 10px 12px;">Home</a>
            ${role === "student" ? `<a class="btn btn-primary" href="${ROUTES.studentDashboard}" style="padding: 10px 12px;">Dashboard</a>` : ""}
            ${role === "recruiter" ? `<a class="btn btn-primary" href="${ROUTES.recruiterDashboard}" style="padding: 10px 12px;">Dashboard</a>` : ""}
            <button class="btn" id="btn-logout" style="padding: 10px 12px;">Logout</button>
          </div>

          <button class="nav-toggle" id="nav-toggle" aria-label="Open sidebar">≡</button>
        </div>
      `;

      const btnLogout = $("#btn-logout", headerMount);
      if (btnLogout) {
        btnLogout.addEventListener("click", () => {
          localStorage.removeItem(LS.session);
          showToast({ title: "Logged out", body: "Your session was cleared.", type: "info" });
          window.location.href = "index.html";
        });
      }
    }

    const footerMount = $("#app-footer");
    if (footerMount) {
      footerMount.innerHTML = `
        <div class="container footer">
          <div style="font-weight: 900; color: rgba(234,241,255,.90);">AI-Powered Decentralized Skill Verification & Job Matching</div>
          <div style="margin-top: 6px;">
            Frontend prototype (HTML/CSS/JS only). Ready to integrate backend later.
          </div>
          <div style="margin-top: 6px;">Tip: This UI uses <span class="mono">localStorage</span> for mock data.</div>
        </div>
      `;
    }
  }

  function injectSidebar() {
    const sidebar = $("#app-sidebar");
    if (!sidebar) return;

    const role = roleFromDatasetOrSession();
    const menuRole = role || document.body.dataset.role || null;

    const menuLinks = navLinksForRole(menuRole);
    const session = getSession();
    const name = session && session.name ? session.name : "";

    sidebar.innerHTML = `
      <h3>${escapeHtml(pageTitleForRole(menuRole))}</h3>
      <div class="menu">
        ${menuLinks
          .map(
            (l) => `
          <a href="${escapeHtml(l.href)}" data-nav="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`
          )
          .join("")}
      </div>
      <div class="hr"></div>
      <div class="list" style="gap: 10px;">
        <div class="list-item">
          <div class="title">Quick Status</div>
          <div class="meta">
            ${name ? `Signed in as <b>${escapeHtml(name)}</b>.` : "Sign in to unlock dashboard features."}
          </div>
          <div class="pill-row">
            <span class="pill">${escapeHtml(menuRole ? menuRole.toUpperCase() : "GUEST")}</span>
            <span class="pill">Backend: Not connected</span>
          </div>
        </div>
      </div>
    `;

    // Active link highlight
    const page = getPageId();
    const activeHref =
      page === "student-dashboard" ? ROUTES.studentDashboard :
      page === "recruiter-dashboard" ? ROUTES.recruiterDashboard :
      page === "resume-upload" ? ROUTES.resumeUpload :
      page === "candidate-details" ? ROUTES.candidateDetails :
      page === "verify-resume" ? ROUTES.verifyResume :
      page === "job-match-result" ? ROUTES.jobMatch :
      "";

    $all(".menu a", sidebar).forEach((a) => {
      if (activeHref && a.getAttribute("href") === activeHref) {
        a.classList.add("menu-link--active");
      }
    });
  }

  function setupMobileSidebar() {
    const overlay = ensureSidebarOverlay();
    const toggle = $("#nav-toggle");
    const sidebar = $("#app-sidebar");

    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", () => {
      const open = sidebar.classList.toggle("sidebar--open");
      overlay.classList.toggle("sidebar-overlay--open", open);
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("sidebar--open");
      overlay.classList.remove("sidebar-overlay--open");
    });

    // Close on link click (mobile UX)
    $all(".menu a", sidebar).forEach((a) => {
      a.addEventListener("click", () => {
        sidebar.classList.remove("sidebar--open");
        overlay.classList.remove("sidebar-overlay--open");
      });
    });
  }

  function ensureSidebarOverlay() {
    let overlay = $(".sidebar-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function guardRoute() {
    const mode = getProtectedMode(); // "student" | "recruiter" | "any" | ""
    if (!mode) return true;

    const session = getSession();
    const role = session && session.role ? session.role : null;

    const protectedEl = document.querySelector("[data-protected-content]");
    if (!protectedEl) return true;

    const allowed = mode === "any" ? !!role : role === mode;
    if (allowed) {
      protectedEl.classList.remove("hidden");
      return true;
    }

    protectedEl.classList.add("hidden");

    // If protected content is hidden, show a guard message if present.
    const guardEl = document.querySelector("[data-auth-guard]");
    if (guardEl) guardEl.classList.remove("hidden");

    // Redirect after a short delay (keeps UX simple)
    const redirectTo =
      mode === "student" ? ROUTES.studentLogin :
      mode === "recruiter" ? ROUTES.recruiterLogin :
      "index.html";

    setTimeout(() => {
      window.location.href = redirectTo;
    }, 1600);

    return false;
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    const out = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  }

  function hashString(str) {
    // Deterministic small hash for mock scoring
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return Math.abs(h >>> 0);
  }

  function computeVerificationScore({ candidateId, fileName }) {
    const base = hashString(String(candidateId || "") + "|" + String(fileName || ""));
    // Score in [65..99] with slight variation
    return 65 + (base % 35);
  }

  function computeMatchScore({ candidateSkills, job }) {
    const s = (candidateSkills || []).join(",").toLowerCase();
    const req = (job.requiredSkills || []).join(",").toLowerCase();

    let hits = 0;
    (job.requiredSkills || []).forEach((sk) => {
      const t = String(sk).toLowerCase();
      if (s.includes(t)) hits += 1;
    });

    const max = Math.max(1, (job.requiredSkills || []).length);
    const ratio = hits / max;

    // Base + ratio mapping => [50..98]
    const score = Math.round(50 + ratio * 48);
    return Math.min(98, Math.max(50, score));
  }

  function showProgress(targetEl, value, label) {
    const bar = $("[data-progress-bar]", targetEl);
    const txt = $("[data-progress-text]", targetEl);
    if (bar) bar.style.width = `${value}%`;
    if (txt) txt.textContent = `${label || "Progress"}: ${value}%`;
  }

  function attachValidation(form) {
    // Common approach:
    // - Mark inputs with data-validate="email|password|minlen:8|required"
    // - Put <div class="field-error" data-error-for="fieldName"></div> under each input
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearFormErrors(form);

      let ok = true;

      const fields = $all("[data-validate]", form);
      for (const input of fields) {
        const rule = input.getAttribute("data-validate") || "";
        const fieldName = input.name || input.id;

        const val = input.type === "file" ? (input.files && input.files[0] ? input.files[0] : null) : input.value;

        if (rule === "required") {
          const empty = input.type === "file" ? !val : !String(val || "").trim();
          if (empty) {
            ok = false;
            setFieldError(input, "This field is required.");
          }
        } else if (rule === "email") {
          if (!isValidEmail(val)) {
            ok = false;
            setFieldError(input, "Please enter a valid email address.");
          }
        } else if (rule === "password") {
          const s = String(val || "");
          if (s.length < 8) {
            ok = false;
            setFieldError(input, "Password must be at least 8 characters.");
          }
        } else if (rule === "confirm-password") {
          // handled separately (see below)
        } else if (rule.startsWith("minlen:")) {
          const n = parseInt(rule.split(":")[1], 10);
          const s = String(val || "");
          if (s.trim().length < n) {
            ok = false;
            setFieldError(input, `Minimum length is ${n} characters.`);
          }
        }

        if (rule === "confirm-password") {
          // We validate confirm password separately below
          // (Keep this in one place to avoid missing rules.)
        }
      }

      // Special case: confirm password
      const confirm = form.querySelector('input[name="confirmPassword"], input[data-confirm-password="true"]');
      const password = form.querySelector('input[name="password"]');

      if (confirm && password) {
        if (String(confirm.value || "") !== String(password.value || "")) {
          ok = false;
          // error element name should match confirm's name
          setFieldError(confirm, "Passwords do not match.");
        }
      }

      const customOk = window.__customFormValidation ? window.__customFormValidation(form) : true;
      if (customOk === false) ok = false;

      if (!ok) {
        const msg = $(".form-message", form);
        if (msg) {
          msg.className = "form-message form-message--error";
          msg.textContent = "Please fix the highlighted fields and try again.";
        }
        showToast({ title: "Validation", body: "Fix input errors and resubmit.", type: "error" });
        return;
      }

      // If passed, let page-specific handler decide what to do
      if (typeof window.__onValidatedSubmit === "function") {
        await window.__onValidatedSubmit(form);
      }
    });
  }

  function setupAuthForms() {
    const studentLogin = $("#student-login-form");
    if (studentLogin) {
      attachValidation(studentLogin);
      window.__onValidatedSubmit = async (form) => {
        const email = form.querySelector('input[name="email"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;

        // Mock auth: accept any non-empty valid fields
        setSession({ role: "student", name: email.split("@")[0], email, passwordHint: "*".repeat(Math.min(6, password.length)) });

        showToast({ title: "Welcome!", body: "Student login successful (mock).", type: "success" });
        window.location.href = ROUTES.studentDashboard;
      };
      return;
    }

    const recruiterLogin = $("#recruiter-login-form");
    if (recruiterLogin) {
      attachValidation(recruiterLogin);
      window.__onValidatedSubmit = async (form) => {
        const email = form.querySelector('input[name="email"]').value.trim();
        const password = form.querySelector('input[name="password"]').value;

        setSession({ role: "recruiter", name: email.split("@")[0], email, passwordHint: "*".repeat(Math.min(6, password.length)) });

        showToast({ title: "Welcome!", body: "Recruiter login successful (mock).", type: "success" });
        window.location.href = ROUTES.recruiterDashboard;
      };
      return;
    }

    const studentRegister = $("#student-register-form");
    if (studentRegister) {
      attachValidation(studentRegister);
      window.__onValidatedSubmit = async (form) => {
        const fullName = form.querySelector('input[name="fullName"]').value.trim();
        showToast({ title: "Registered!", body: "Student registration saved (mock). Redirecting...", type: "success" });

        // For now, just move user to login page
        setTimeout(() => (window.location.href = ROUTES.studentLogin), 600);
        // Store partial record for backend later (optional)
        localStorage.setItem("sd_student_signup_mock", JSON.stringify({
          fullName,
          email: form.querySelector('input[name="email"]').value.trim(),
          skills: form.querySelector('input[name="skills"]').value.trim()
        }));
      };
      return;
    }

    const recruiterRegister = $("#recruiter-register-form");
    if (recruiterRegister) {
      attachValidation(recruiterRegister);
      window.__onValidatedSubmit = async (form) => {
        const companyName = form.querySelector('input[name="companyName"]').value.trim();
        showToast({ title: "Registered!", body: "Recruiter registration saved (mock). Redirecting...", type: "success" });

        localStorage.setItem("sd_recruiter_signup_mock", JSON.stringify({
          companyName,
          email: form.querySelector('input[name="email"]').value.trim(),
          industry: form.querySelector('input[name="industry"]').value.trim()
        }));

        setTimeout(() => (window.location.href = ROUTES.recruiterLogin), 600);
      };
      return;
    }
  }

  function setupResumeUpload() {
    const form = $("#resume-upload-form");
    if (!form) return;

    attachValidation(form);
    window.__onValidatedSubmit = async (validatedForm) => {
      const title = validatedForm.querySelector('input[name="resumeTitle"]').value.trim();
      const targetJob = validatedForm.querySelector('input[name="targetJob"]').value.trim();
      const file = validatedForm.querySelector('input[type="file"][name="resumeFile"]').files[0];

      // Save mock resume metadata for verification page
      localStorage.setItem(LS.resume, JSON.stringify({
        resumeTitle: title,
        targetJob,
        fileName: file.name,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      }));

      showToast({ title: "Resume uploaded", body: "Saved for mock verification.", type: "success" });
      window.location.href = `${ROUTES.verifyResume}`;
    };
  }

  function setupCandidateDetails() {
    const page = getPageId();
    if (page !== "candidate-details") return;

    const q = parseQuery();
    const existingId = q.id || localStorage.getItem(LS.lastCandidateId) || "CND-1029";

    const input = $("#candidate-id-input");
    if (input) input.value = existingId;

    const loadBtn = $("#btn-load-candidate");
    if (loadBtn) {
      loadBtn.addEventListener("click", () => {
        const candidateId = String(input.value || "").trim();
        if (!candidateId) {
          showToast({ title: "Candidate ID required", body: "Enter a candidate ID to load mock data.", type: "error" });
          return;
        }
        localStorage.setItem(LS.lastCandidateId, candidateId);
        const candidate = generateMockCandidate(candidateId);
        localStorage.setItem(LS.candidate, JSON.stringify(candidate));
        renderCandidate(candidate);
        showToast({ title: "Candidate loaded", body: `Loaded mock candidate for ${candidateId}.`, type: "info" });
      });
    }

    const verifyBtn = $("#btn-verify-from-candidate");
    if (verifyBtn) {
      verifyBtn.addEventListener("click", () => {
        const candidateId = String(input.value || "").trim();
        if (!candidateId) {
          showToast({ title: "Candidate ID required", body: "Load a candidate first.", type: "error" });
          return;
        }
        localStorage.setItem(LS.lastCandidateId, candidateId);
        window.location.href = `${ROUTES.verifyResume}?id=${encodeURIComponent(candidateId)}`;
      });
    }

    // Auto-load once
    const candidate = generateMockCandidate(existingId);
    localStorage.setItem(LS.candidate, JSON.stringify(candidate));
    renderCandidate(candidate);
  }

  function generateMockCandidate(candidateId) {
    const seed = hashString(candidateId);
    const names = ["Aisha Khan", "Rahul Sharma", "Sara Ahmed", "Vikram Patel", "Nora Johnson", "Diego Martinez"];
    const roles = ["Frontend Engineer", "Backend Developer", "Data Analyst", "Full Stack Developer", "DevOps Engineer", "Mobile Developer"];

    const name = names[seed % names.length];
    const role = roles[seed % roles.length];
    const years = 1 + (seed % 8);

    const skillPool = [
      "JavaScript", "React", "Node.js", "Express", "HTML", "CSS", "TypeScript",
      "Python", "SQL", "MongoDB", "Docker", "Kubernetes", "AWS", "CI/CD", "REST APIs"
    ];

    const skills = [];
    for (let i = 0; i < 7; i++) {
      skills.push(skillPool[(seed + i * 3) % skillPool.length]);
    }

    const verifiedStatus = seed % 3 === 0 ? "Verified" : (seed % 3 === 1 ? "Partially Verified" : "Needs Verification");

    return {
      id: candidateId,
      name,
      role,
      experienceYears: years,
      skills,
      summary:
        "Generated mock profile. Later you will connect backend to read real candidate data and verification proofs.",
      verificationHint: verifiedStatus
    };
  }

  function renderCandidate(candidate) {
    const root = $("#candidate-details-root");
    if (!root) return;

    const statusPill =
      candidate.verificationHint === "Verified" ? `<span class="pill pill--good">${escapeHtml(candidate.verificationHint)}</span>` :
      candidate.verificationHint === "Partially Verified" ? `<span class="pill pill--warn">${escapeHtml(candidate.verificationHint)}</span>` :
      `<span class="pill pill--bad">${escapeHtml(candidate.verificationHint)}</span>`;

    root.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-inner">
            <div class="page-title">Candidate Profile</div>
            <p class="subtle">ID: <span class="mono">${escapeHtml(candidate.id)}</span></p>
            <div style="height: 10px;"></div>
            <div class="list-item" style="background: rgba(255,255,255,.03);">
              <div class="title">${escapeHtml(candidate.name)}</div>
              <div class="meta">${escapeHtml(candidate.role)} · ${escapeHtml(candidate.experienceYears)} years</div>
              <div class="pill-row">
                ${statusPill}
                <span class="pill">Proof Type: Placeholder</span>
              </div>
              <div style="margin-top: 10px; color: rgba(234,241,255,.78);">${escapeHtml(candidate.summary)}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-inner">
            <div class="page-title">Skills (Mock)</div>
            <div class="pill-row">
              ${candidate.skills.map((s) => `<span class="pill">${escapeHtml(s)}</span>`).join("")}
            </div>
            <div class="hr"></div>
            <div class="page-title" style="font-size: 16px; margin-top: 0;">Next Step</div>
            <p class="subtle">Run verification to generate the trust score used for job matching.</p>
            <div class="btn-row">
              <a class="btn btn-primary" id="btn-verify-from-candidate" href="#">
                Verify Resume
              </a>
              <a class="btn" href="${ROUTES.jobMatch}" id="btn-view-match-result">
                View Job Matches
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style="height: 14px;"></div>

      <div class="card">
        <div class="card-inner">
          <div class="page-title" style="font-size: 16px;">What backend integration could do later</div>
          <div class="subtle" style="margin-top: 6px; line-height: 1.55;">
            Replace mock candidate generation with API calls that:
            (1) fetch candidate profile from DB,
            (2) compute verification evidence (e.g., on-chain proofs),
            (3) attach verification results to candidate record.
          </div>
        </div>
      </div>
    `;
  }

  function setupVerifyResume() {
    const page = getPageId();
    if (page !== "verify-resume") return;

    const q = parseQuery();
    const candidateId = q.id || localStorage.getItem(LS.lastCandidateId) || "CND-1029";
    localStorage.setItem(LS.lastCandidateId, candidateId);

    // Populate candidate info summary
    const candidateStr = localStorage.getItem(LS.candidate);
    let candidate = null;
    try { candidate = candidateStr ? JSON.parse(candidateStr) : null; } catch { candidate = null; }

    if (!candidate || !candidate.id) {
      candidate = generateMockCandidate(candidateId);
      localStorage.setItem(LS.candidate, JSON.stringify(candidate));
    }

    const resume = readResumeOrNull();

    const fileName = resume && resume.fileName ? resume.fileName : "No file uploaded yet (mock)";
    $("#verify-candidate-summary")?.classList.remove("hidden");

    $("#verify-candidate-summary")?.querySelector("[data-candidate-id]").textContent = candidateId;
    $("#verify-candidate-summary")?.querySelector("[data-candidate-name]").textContent = candidate.name;
    $("#verify-candidate-summary")?.querySelector("[data-resume-filename]").textContent = fileName;

    const btn = $("#btn-run-verification");
    if (btn) {
      btn.addEventListener("click", () => {
        // UI progress + mock compute
        const resultRoot = $("#verification-result-root");
        if (resultRoot) resultRoot.classList.remove("hidden");

        const progressWrap = $("#verification-progress");
        if (progressWrap) {
          showProgress(progressWrap, 10, "Verification");
        }

        showToast({ title: "Verifying...", body: "Running mock verification checks.", type: "info" });

        // Simulate steps (no backend calls)
        setTimeout(() => { if (progressWrap) showProgress(progressWrap, 45, "Verification"); }, 450);
        setTimeout(() => { if (progressWrap) showProgress(progressWrap, 75, "Verification"); }, 900);

        setTimeout(() => {
          const score = computeVerificationScore({ candidateId, fileName });
          const trustLabel = score >= 90 ? "High Trust" : (score >= 78 ? "Medium Trust" : "Low Trust");

          const evidence = [
            { label: "Skill keyword match", value: Math.min(100, score - 2) },
            { label: "Resume consistency checks", value: Math.min(100, score - 6) },
            { label: "Identity & document signals", value: Math.min(100, score - 10) }
          ];

          const verification = {
            candidateId,
            score,
            trustLabel,
            fileName,
            evidence,
            verifiedAt: new Date().toISOString()
          };

          localStorage.setItem(LS.verification, JSON.stringify(verification));

          if (resultRoot) {
            const pillClass = score >= 90 ? "pill--good" : (score >= 78 ? "pill--warn" : "pill--bad");
            resultRoot.innerHTML = `
              <div class="card">
                <div class="card-inner">
                  <div class="page-title">Verification Result</div>
                  <p class="subtle">
                    Candidate <span class="mono">${escapeHtml(candidateId)}</span> · ${escapeHtml(trustLabel)}
                  </p>

                  <div style="height: 10px;"></div>

                  <div class="list-item" style="background: rgba(255,255,255,.03);">
                    <div class="title">Trust Score</div>
                    <div class="meta" style="margin-top: 8px;">
                      <span class="pill ${pillClass}">${score}/100</span>
                      <span class="pill">Evidence Type: Placeholder</span>
                    </div>
                    <div style="height: 12px;"></div>
                    <div class="grid-2">
                      ${evidence.map(ev => `
                        <div>
                          <div style="font-weight: 900;">${escapeHtml(ev.label)}</div>
                          <div class="progress" style="margin-top: 8px;">
                            <div style="width: ${ev.value}%;"></div>
                          </div>
                          <div class="subtle" style="margin-top: 8px;">${ev.value}%</div>
                        </div>
                      `).join("")}
                    </div>
                  </div>

                  <div class="btn-row" style="margin-top: 14px;">
                    <a class="btn btn-primary" id="btn-go-to-job-match" href="${ROUTES.jobMatch}?id=${encodeURIComponent(candidateId)}">
                      Continue to Job Match
                    </a>
                    <a class="btn" href="${ROUTES.candidateDetails}?id=${encodeURIComponent(candidateId)}">
                      Back to Candidate
                    </a>
                  </div>
                </div>
              </div>
            `;
          }

          showToast({ title: "Verification complete", body: "Generated verification score (mock).", type: "success" });
        }, 1350);
      });
    }

    // Also render last verification if exists
    const verif = readVerificationOrNull();
    if (verif && verif.candidateId === candidateId) {
      const resultRoot = $("#verification-result-root");
      if (resultRoot) {
        resultRoot.classList.remove("hidden");
        // Keep it simple: show only key score
        resultRoot.innerHTML = `
          <div class="card">
            <div class="card-inner">
              <div class="page-title">Last Verification</div>
              <p class="subtle">Saved trust score: <span class="pill pill--warn">${escapeHtml(verif.score)}/100</span></p>
              <div class="btn-row">
                <a class="btn btn-primary" href="${ROUTES.jobMatch}?id=${encodeURIComponent(candidateId)}">View Job Matches</a>
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  function readResumeOrNull() {
    try {
      const s = localStorage.getItem(LS.resume);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  function readVerificationOrNull() {
    try {
      const s = localStorage.getItem(LS.verification);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  function setupJobMatchResult() {
    const page = getPageId();
    if (page !== "job-match-result") return;

    const q = parseQuery();
    const candidateId = q.id || localStorage.getItem(LS.lastCandidateId) || "CND-1029";
    localStorage.setItem(LS.lastCandidateId, candidateId);

    const candidateStr = localStorage.getItem(LS.candidate);
    let candidate = null;
    try { candidate = candidateStr ? JSON.parse(candidateStr) : null; } catch { candidate = null; }
    if (!candidate || !candidate.id) {
      candidate = generateMockCandidate(candidateId);
      localStorage.setItem(LS.candidate, JSON.stringify(candidate));
    }

    const verification = readVerificationOrNull();

    const resume = readResumeOrNull();
    const trustScore = verification && verification.candidateId === candidateId ? verification.score : null;

    const jobs = getMockJobsForMatch();

    // Compute matches
    const enriched = jobs.map((job) => {
      const base = computeMatchScore({ candidateSkills: candidate.skills, job });
      // If verification exists, slightly improve match for high trust
      const trustBoost = trustScore == null ? 0 : Math.round((trustScore - 70) * 0.25); // rough
      const match = Math.min(99, Math.max(45, base + trustBoost));
      return { job, matchScore: match };
    }).sort((a, b) => b.matchScore - a.matchScore);

    // Render
    const root = $("#job-match-root");
    if (!root) return;

    const trustPill =
      trustScore == null ? `<span class="pill pill--warn">Verification not run yet</span>` :
      trustScore >= 90 ? `<span class="pill pill--good">Trust ${trustScore}/100</span>` :
      trustScore >= 78 ? `<span class="pill pill--warn">Trust ${trustScore}/100</span>` :
      `<span class="pill pill--bad">Trust ${trustScore}/100</span>`;

    const top = enriched.slice(0, 6);

    root.innerHTML = `
      <div class="grid-2">
        <div class="card">
          <div class="card-inner">
            <div class="page-title">Job Match Result</div>
            <p class="subtle">
              Candidate: <b>${escapeHtml(candidate.name)}</b> · ID: <span class="mono">${escapeHtml(candidateId)}</span>
            </p>
            <div style="height: 10px;"></div>
            <div class="pill-row">
              ${trustPill}
              <span class="pill">Ranking Method: Mock</span>
              <span class="pill">Skills: ${escapeHtml(candidate.skills.slice(0, 3).join(", "))}...</span>
            </div>
            <div class="hr"></div>
            <div class="page-title" style="font-size: 16px;">Resume Context (Mock)</div>
            <p class="subtle" style="margin-top: 6px;">
              File: <span class="mono">${escapeHtml(resume && resume.fileName ? resume.fileName : "Not uploaded/available")}</span>
            </p>
            <div class="btn-row">
              <a class="btn" href="${ROUTES.verifyResume}?id=${encodeURIComponent(candidateId)}">Re-run Verification</a>
              <a class="btn btn-primary" href="${ROUTES.candidateDetails}?id=${encodeURIComponent(candidateId)}">Candidate Details</a>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-inner">
            <div class="page-title" style="font-size: 16px;">Top Matches</div>
            <div style="height: 10px;"></div>
            <div class="list">
              ${top.map(x => {
                const pillClass = x.matchScore >= 88 ? "pill--good" : x.matchScore >= 74 ? "pill--warn" : "pill--bad";
                return `
                  <div class="list-item">
                    <div class="title">${escapeHtml(x.job.title)}</div>
                    <div class="meta">${escapeHtml(x.job.company)} · ${escapeHtml(x.job.location)}</div>
                    <div style="margin-top: 10px;">
                      <span class="pill ${pillClass}">${x.matchScore}% Match</span>
                    </div>
                    <div class="pill-row">
                      ${(x.job.requiredSkills || []).slice(0, 4).map(s => `<span class="pill">${escapeHtml(s)}</span>`).join("")}
                    </div>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
      </div>

      <div style="height: 14px;"></div>

      <div class="card">
        <div class="card-inner">
          <div class="page-title" style="font-size: 16px;">Explainability (Mock)</div>
          <p class="subtle" style="margin-top: 6px; line-height: 1.55;">
            In a real backend integration, you would store:
            (1) which skills/clauses were matched,
            (2) the verification proof references,
            (3) final scoring formula outputs
            so recruiters/students can review why each job was ranked.
          </p>
          <div class="btn-row">
            <a class="btn btn-warn" href="index.html">Start New Session</a>
          </div>
        </div>
      </div>
    `;
  }

  function getMockJobsForMatch() {
    return [
      {
        title: "Frontend Engineer (React)",
        company: "Skyline Labs",
        location: "Remote",
        requiredSkills: ["React", "JavaScript", "HTML", "CSS", "TypeScript"]
      },
      {
        title: "Backend Developer (Node.js)",
        company: "Orbit Systems",
        location: "Bengaluru",
        requiredSkills: ["Node.js", "Express", "REST APIs", "SQL", "JavaScript"]
      },
      {
        title: "Full Stack Developer",
        company: "Atlas Build Co.",
        location: "Pune",
        requiredSkills: ["React", "Node.js", "MongoDB", "REST APIs", "JavaScript"]
      },
      {
        title: "Data Analyst",
        company: "Pulse Analytics",
        location: "Hyderabad",
        requiredSkills: ["SQL", "Python", "REST APIs", "Data Visualization", "Communication"]
      },
      {
        title: "DevOps Engineer",
        company: "CloudSpring",
        location: "Remote",
        requiredSkills: ["Docker", "CI/CD", "AWS", "Kubernetes", "Linux"]
      },
      {
        title: "Mobile Developer",
        company: "Nova Apps",
        location: "Chennai",
        requiredSkills: ["JavaScript", "TypeScript", "REST APIs", "React", "Performance"]
      },
      {
        title: "API Integration Specialist",
        company: "Beacon Tech",
        location: "Delhi",
        requiredSkills: ["REST APIs", "Express", "SQL", "JavaScript", "Authentication"]
      }
    ];
  }

  function setupDashboards() {
    const page = getPageId();

    if (page === "student-dashboard") {
      const session = getSession();
      if (session && session.role === "student") {
        const name = session.name || "Student";
        $("#student-name") && ($("#student-name").textContent = name);
      }

      // Mock recent actions list
      const resume = readResumeOrNull();
      const verif = readVerificationOrNull();

      const actions = [
        { title: "Upload Resume", meta: "Add your resume to run verification checks.", href: ROUTES.resumeUpload, pill: "Next" },
        { title: "Verify Skills", meta: "Generate trust score from resume signals (mock).", href: ROUTES.verifyResume, pill: verif ? "Done" : "Pending" },
        { title: "Job Match Results", meta: "See ranked roles based on match scoring (mock).", href: ROUTES.jobMatch, pill: "Preview" }
      ];

      const root = $("#recent-actions-root");
      if (root) {
        root.innerHTML = actions.map(a => `
          <div class="list-item">
            <div class="title">${escapeHtml(a.title)}</div>
            <div class="meta">${escapeHtml(a.meta)}</div>
            <div class="btn-row" style="margin-top: 10px;">
              <a class="btn ${a.pill === "Done" ? "btn-good" : "btn-primary"}" href="${escapeHtml(a.href)}">${escapeHtml(a.pill)}</a>
            </div>
          </div>
        `).join("");
      }

      // KPI values
      const kpiResume = resume ? "Uploaded" : "Not uploaded";
      const kpiTrust = verif ? `${verif.score}/100` : "—";
      const kpiMode = "Mock scoring";

      $("#kpi-resume") && ($("#kpi-resume").textContent = kpiResume);
      $("#kpi-trust") && ($("#kpi-trust").textContent = kpiTrust);
      $("#kpi-mode") && ($("#kpi-mode").textContent = kpiMode);
    }

    if (page === "recruiter-dashboard") {
      const session = getSession();
      const name = session && session.role === "recruiter" ? session.name : "Recruiter";
      $("#recruiter-name") && ($("#recruiter-name").textContent = name);

      const recent = [
        { title: "Review Verified Candidates", meta: "Focus on trust score + explainability outputs.", pill: "Trust" },
        { title: "Rank by Match Score", meta: "Use match percentages to short-list roles.", pill: "Ranking" },
        { title: "Export Later (Backend)", meta: "Generate shortlist/report using backend APIs.", pill: "Later" }
      ];

      const root = $("#recruiter-recent-root");
      if (root) {
        root.innerHTML = recent.map(x => `
          <div class="list-item">
            <div class="title">${escapeHtml(x.title)}</div>
            <div class="meta">${escapeHtml(x.meta)}</div>
            <div style="margin-top: 10px;">
              <span class="pill">${escapeHtml(x.pill)}</span>
            </div>
          </div>
        `).join("");
      }
    }
  }

  function init() {
    injectHeaderFooter();
    injectSidebar();
    setupMobileSidebar();

    // Ensure protected content works early
    guardRoute();

    setupAuthForms();
    setupResumeUpload();
    setupCandidateDetails();
    setupVerifyResume();
    setupJobMatchResult();
    setupDashboards();

    // Attach validation if other forms exist
    // (Most forms are handled via page-specific functions above.)
    const forms = $all("form[data-validate-hook='true']");
    forms.forEach((f) => attachValidation(f));
  }

  // Kickoff after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();