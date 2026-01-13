(function() {
  const API = window.API_BASE || "";
  const $ = (id) => document.getElementById(id);

  // Excel upload helpers
  function normalizePhone(raw) {
    if (!raw) return "";
    let s = String(raw).trim();

    // remove spaces, dashes, parentheses
    s = s.replace(/[()\s-]/g, "");

    // handle leading +
    if (s.startsWith("+")) s = s.substring(1);

    // if it's like 9725... keep
    // if it's Israeli local like 05xxxxxxxx -> convert to 9725xxxxxxx (optional)
    if (s.startsWith("05") && s.length >= 10) {
      s = "972" + s.substring(1);
    }

    // keep digits only
    s = s.replace(/\D/g, "");
    return s;
  }

  function isEmail(x) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(x).trim());
  }

  function extractFromRow(rowObj) {
    // rowObj is like { "Email": "...", "Phone": "..." } depending on headers
    const keys = Object.keys(rowObj || {});
    const getByKeyIncludes = (arr) =>
      keys.find(k => arr.some(a => k.toLowerCase().includes(a)));

    const emailKey = getByKeyIncludes(["email", "מייל", "דוא", "דוא\"ל"]);
    const phoneKey = getByKeyIncludes(["phone", "טל", "טלפון", "mobile", "נייד"]);

    const email = emailKey ? String(rowObj[emailKey] || "").trim() : "";
    const phone = phoneKey ? normalizePhone(rowObj[phoneKey]) : "";

    // fallback: scan any cell for email/phone
    let email2 = email;
    let phone2 = phone;

    if (!email2 || !phone2) {
      for (const k of keys) {
        const v = String(rowObj[k] ?? "").trim();
        if (!email2 && isEmail(v)) email2 = v;
        if (!phone2) {
          const p = normalizePhone(v);
          if (p.length >= 9) phone2 = p;
        }
      }
    }

    return { email: email2, phone: phone2 };
  }

  function uniqueRecipients(lines) {
    const seen = new Set();
    const out = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out;
  }

  async function handleExcelUpload(file) {
    const statusEl = $("excelStatus");
    if (statusEl) statusEl.textContent = "קוראת קובץ...";

    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });

    const firstSheet = wb.SheetNames[0];
    const ws = wb.Sheets[firstSheet];

    // Convert to array of objects using header row
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

    const lines = [];
    for (const row of rows) {
      const { email, phone } = extractFromRow(row);
      if (email) lines.push(email);
      if (phone) lines.push(phone);
    }

    const cleaned = uniqueRecipients(lines);

    // Append to existing textarea (so user can add manually too)
    const ta = $("recipientsList");
    const existing = (ta.value || "").trim();
    const merged = uniqueRecipients([
      ...existing.split(/\r?\n/),
      ...cleaned
    ]);

    ta.value = merged.join("\n");

    if (statusEl) statusEl.textContent = `נטענו ${cleaned.length} פריטים מהקובץ ✅`;
  }

  // Campaign state object - single source of truth
  const campaignState = {
    campaignId: null,
    eventId: null,
    eventName: "",
    eventDate: null,
    eventTime: null,
    eventLocation: "",
    subject: "",
    messageText: "",
    channel: "EMAIL",
    templateId: null,
    templateUrl: null,
    templateTitle: "",
    recipients: [],
    campaignName: ""
  };

  // Legacy variables for backward compatibility
  let campaignId = null;
  let eventId = null;
  let eventName = "";
  let selectedContentIndex = null;
  let selectedTemplateId = null;
  let selectedTemplateUrl = null;
  let selectedTemplateTitle = "";
  let selectedChannel = "EMAIL";
  let contentOptions = [];
  let templates = [];
  let aiOptions = ["", "", ""];

  function setStep(n) {
    document.querySelectorAll(".stepPane").forEach(p => p.classList.add("hidden"));
    const stepEl = $(`step${n}`);
    if (stepEl) stepEl.classList.remove("hidden");

    document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
    const stepIndicator = document.querySelector(`.step[data-step="${n}"]`);
    if (stepIndicator) stepIndicator.classList.add("active");

    // Update summary when entering step 6
    if (n === 6) {
      updateSummaryAndPreview();
    }
  }

  // Update campaign state from UI
  function syncStateFromUI() {
    campaignState.subject = $("subject") ? $("subject").value.trim() : "";
    campaignState.messageText = $("messageText") ? $("messageText").value.trim() : "";
    campaignState.channel = selectedChannel;
    campaignState.templateId = selectedTemplateId;
    campaignState.templateUrl = selectedTemplateUrl;
    campaignState.templateTitle = selectedTemplateTitle;
    campaignState.campaignName = $("campaignName") ? $("campaignName").value.trim() : "";
    
    // Parse recipients if available
    const recipientsText = $("recipientsList") ? $("recipientsList").value.trim() : "";
    if (recipientsText) {
      campaignState.recipients = parseRecipients(recipientsText);
    }
  }

  // Calculate SMS segments (160 chars per segment)
  function calculateSMSSegments(text) {
    if (!text) return { chars: 0, segments: 0 };
    const chars = text.length;
    const segments = Math.ceil(chars / 160);
    return { chars, segments };
  }

  // Update summary and preview
  async function updateSummaryAndPreview() {
    syncStateFromUI();
    // Update all preview panes
    renderMessagePreview("sms");
    renderMessagePreview("email");
    renderMessagePreview("whatsapp");
  }

  // Render message preview for a specific channel
  function renderMessagePreview(channel) {
    const text = campaignState.messageText || "";
    const subject = campaignState.subject || "";
    const imageUrl = campaignState.templateUrl || "";

    // Helper to escape HTML but preserve line breaks and emojis
    function formatText(txt) {
      if (!txt) return "<span class='muted'>טקסט הודעה...</span>";
      // Escape HTML but preserve line breaks and emojis
      // Use a temporary placeholder for <br/> tags
      return txt
        .replace(/\n/g, "___LINEBREAK___")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/___LINEBREAK___/g, "<br/>");
    }

    switch (channel) {
      case "sms": {
        const smsPreviewEl = $("previewSMS");
        if (!smsPreviewEl) return;
        
        const smsInfo = calculateSMSSegments(text);
        let smsHtml = "";
        
        // Image thumbnail (MMS-style) if exists
        if (imageUrl) {
          smsHtml += `<div class="preview-image-container"><img src="${imageUrl}" alt="Image" class="preview-image" /></div>`;
        }
        
        // Message bubble
        smsHtml += `
          <div class="sms-bubble">
            <div class="sms-text">${formatText(text)}</div>
          </div>
          <div class="sms-info">
            <span>${smsInfo.chars} תווים</span>
            <span>${smsInfo.segments} ${smsInfo.segments === 1 ? 'קטע' : 'קטעים'}</span>
          </div>
        `;
        
        smsPreviewEl.innerHTML = smsHtml;
        break;
      }
      
      case "email": {
        const emailPreviewEl = $("previewEmail");
        if (!emailPreviewEl) return;
        
        let emailHtml = "";
        
        // Subject line
        emailHtml += `<div class="email-subject">${subject || "<span class='muted'>נושא...</span>"}</div>`;
        
        // Header image (big) if exists
        if (imageUrl) {
          emailHtml += `<div class="email-header-img"><img src="${imageUrl}" alt="Header" class="preview-image-large" /></div>`;
        }
        
        // Body text
        emailHtml += `<div class="email-body">${formatText(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')}</div>`;
        
        emailPreviewEl.innerHTML = emailHtml;
        break;
      }
      
      case "whatsapp": {
        const whatsappPreviewEl = $("previewWhatsApp");
        if (!whatsappPreviewEl) return;
        
        let waHtml = "";
        
        // Image above bubble (WhatsApp image+caption style) if exists
        if (imageUrl) {
          waHtml += `<div class="wa-image"><img src="${imageUrl}" alt="Image" class="preview-image" /></div>`;
        }
        
        // Text bubble
        waHtml += `
          <div class="wa-bubble">
            <div class="wa-text">${formatText(text)}</div>
            <div class="wa-time">${new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `;
        
        whatsappPreviewEl.innerHTML = waHtml;
        break;
      }
    }
  }

  async function api(path, opts = {}) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login.html";
      return null;
    }

    // Ensure path starts with "/"
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // Get API_BASE, fallback to empty string (relative URLs)
    const apiBase = window.API_BASE || "";
    
    // Build full URL - ensure no double slashes
    let url = apiBase + path;
    // Remove double slashes (but keep http:// or https://)
    url = url.replace(/([^:]\/)\/+/g, "$1");
    
    console.log("API call - path:", path, "apiBase:", apiBase, "full URL:", url, "method:", opts.method || "GET");

    const res = await fetch(url, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.error("API error:", res.status, text);
      let errorMessage = `HTTP ${res.status}`;
      try {
        const errorJson = JSON.parse(text);
        errorMessage = errorJson.message || errorJson.error || text || errorMessage;
      } catch (e) {
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res.text();
  }

  async function loadEvents() {
    try {
      // Load only approved events for campaign creation
      console.log("Loading approved events...");
      const events = await api("/client/events/approved");
      console.log("Events loaded:", events);
      if (!events || !Array.isArray(events)) {
        console.error("Invalid events response:", events);
        throw new Error("תגובה לא תקינה מהשרת");
      }
      const select = $("eventSelect");
      if (!select) {
        console.error("eventSelect element not found");
        return;
      }
      if (events.length === 0) {
        select.innerHTML = '<option value="">אין אירועים מאושרים</option>';
        console.warn("No approved events found for this user");
      } else {
        select.innerHTML = '<option value="">בחר אירוע...</option>' + 
          events.map(e => `<option value="${e.id}">${e.name || ("Event #" + e.id)}</option>`).join("");
      }
    } catch (err) {
      console.error("Failed to load events:", err);
      const errorMsg = err.message || "שגיאה לא ידועה";
      // Show more detailed error in console
      console.error("Error details:", {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      alert("שגיאה בטעינת אירועים: " + errorMsg);
    }
  }

  async function generateAIContent() {
    const promptEl = $("aiPromptInput");
    if (!promptEl) {
      alert("שגיאה: לא נמצא שדה הקלט");
      return;
    }
    
    const prompt = (promptEl.value || "").trim();
    if (!prompt) {
      alert("כתבי טקסט ראשוני כדי שה־AI ישפר אותו 🙂");
      return;
    }

    const btnGen = $("btnGenerateAi");
    if (!btnGen) return;
    
    // Hide and clear options section
    const sec = $("aiOptionsSection");
    if (sec) sec.classList.add("hidden");
    
    $("optText0").innerText = "";
    $("optText1").innerText = "";
    $("optText2").innerText = "";
    aiOptions = ["", "", ""];
    selectedContentIndex = null;
    
    // Clear final message text
    const finalEl = $("finalMessageText");
    if (finalEl) finalEl.value = "";
    
    btnGen.disabled = true;
    btnGen.innerHTML = '<i class="fas fa-spinner fa-spin"></i> מייצר...';
    $("loadingContent").style.display = "block";

    try {
      // First create campaign if not exists
      if (!campaignId) {
        const eventIdVal = Number($("eventSelect").value);
        const campaignName = $("campaignName").value.trim() || "הודעה חדשה";
        
        if (!eventIdVal) {
          alert("אנא בחרי אירוע תחילה");
          $("loadingContent").style.display = "none";
          btnGen.disabled = false;
          btnGen.innerHTML = '<i class="fas fa-magic"></i> שפרי את ההודעה עם AI';
          return;
        }

        const created = await api("/client/campaigns", {
          method: "POST",
          body: JSON.stringify({ eventId: eventIdVal, name: campaignName })
        });
        campaignId = created.id;
        eventId = eventIdVal;
      }

      // Call new AI texts API
      const data = await api("/api/ai/texts", {
        method: "POST",
        body: JSON.stringify({ campaignId, prompt })
      });

      // Validate response format - must have options or texts array
      if (!data || typeof data !== 'object') {
        console.error("Invalid AI response format:", data);
        alert("שגיאה: השרת החזיר תגובה לא תקינה. בדקי את ה-Console ו-Network.");
        return;
      }

      // Support both "options" (new format with channel) and "texts" (backward compatibility)
      let texts = [];
      if (Array.isArray(data.options)) {
        // New format: options is array of {channel, text}
        texts = data.options.map(opt => {
          if (typeof opt === 'object' && opt.text) {
            return opt.text;
          }
          return typeof opt === 'string' ? opt : "";
        });
      } else if (Array.isArray(data.texts)) {
        // Backward compatibility: texts is array of strings
        texts = data.texts;
      }

      // Ensure we have exactly 3 texts
      if (texts.length < 3) {
        console.warn("AI response doesn't have 3 texts:", data);
        console.log("Full AI response:", JSON.stringify(data, null, 2));
        alert("השרת לא החזיר 3 אופציות. בדקי את ה-Response ב-Network.");
        return;
      }

      aiOptions = [
        texts[0] || "",
        texts[1] || "",
        texts[2] || ""
      ];

      // Update UI
      $("optText0").innerText = aiOptions[0] || "";
      $("optText1").innerText = aiOptions[1] || "";
      $("optText2").innerText = aiOptions[2] || "";

      // Show options section only after we have the texts
      if (sec) sec.classList.remove("hidden");

      // Default to first option
      if (aiOptions[0]) {
        setSelectedContentOption(0);
      }

      // Also update legacy contentOptions for compatibility
      contentOptions = aiOptions.map((text, idx) => ({
        title: `אופציה ${idx + 1}`,
        subject: "עדכון מהאירוע",
        text: text
      }));

    } catch (err) {
      console.error("Failed to generate AI content:", err);
      console.error("Error details:", err.message, err.stack);
      
      // Check if it's an authorization error
      if (err.message && (err.message.includes("401") || err.message.includes("Unauthorized"))) {
        alert("שגיאת הרשאה: אנא התחברי מחדש.");
        window.location.href = "/login.html";
        return;
      }
      
      // Check if it's a format error
      if (err.message && err.message.includes("texts")) {
        alert("שגיאה בפורמט התגובה מהשרת. בדקי את ה-Console ו-Network.");
      } else {
        alert("לא הצלחתי לייצר אופציות כרגע: " + (err.message || "שגיאה לא ידועה") + ". נסי שוב.");
      }
    } finally {
      $("loadingContent").style.display = "none";
      btnGen.disabled = false;
      btnGen.innerHTML = '<i class="fas fa-magic"></i> שפרי את ההודעה עם AI';
    }
  }

  function setSelectedContentOption(idx) {
    selectedContentIndex = idx;

    // Update radio buttons
    document.querySelectorAll(".option-radio").forEach(radio => {
      radio.checked = Number(radio.value) === idx;
    });

    // Update card selection
    document.querySelectorAll(".option-card").forEach(card => {
      card.classList.toggle("selected", Number(card.dataset.index) === idx);
    });

    const selectedText = aiOptions[idx] || "";
    
    // Update final message text
    const finalEl = $("finalMessageText");
    if (finalEl) {
      finalEl.value = selectedText;
    }
    
    // Also update messageText in step 3 if it exists
    const messageTextEl = $("messageText");
    if (messageTextEl) {
      messageTextEl.value = selectedText;
    }
    
    // Sync state
    syncStateFromUI();
  }

  function renderContentOptions() {
    const grid = $("contentOptionsGrid");
    if (!grid) return;

    grid.innerHTML = contentOptions.map((o, idx) => `
      <div class="opt ${selectedContentIndex === idx ? "selected" : ""}" data-idx="${idx}">
        <h4>${o.title}</h4>
        <p>${o.text.replace(/\n/g, "<br/>")}</p>
      </div>
    `).join("");

    grid.querySelectorAll(".opt").forEach(el => {
      el.addEventListener("click", () => {
        selectedContentIndex = Number(el.dataset.idx);
        renderContentOptions();
      });
    });
  }

  async function loadTemplates() {
    $("loadingTemplates").style.display = "block";
    try {
      templates = await api("/client/campaigns/templates");
      renderTemplates();
    } catch (err) {
      console.error("Failed to load templates:", err);
      // Fallback to placeholder templates
      templates = [
        { id: 1, title: "עיצוב 1", imageUrl: "/assets/campaign/design1.jpg" },
        { id: 2, title: "עיצוב 2", imageUrl: "/assets/campaign/design2.jpg" },
        { id: 3, title: "עיצוב 3", imageUrl: "/assets/campaign/design3.jpg" },
        { id: 4, title: "עיצוב 4", imageUrl: "/assets/campaign/design4.jpg" },
        { id: 5, title: "עיצוב 5", imageUrl: "/assets/campaign/design5.jpg" },
      ];
      renderTemplates();
    } finally {
      $("loadingTemplates").style.display = "none";
    }
  }

  // Fetch images from Unsplash
  async function fetchUnsplashImages(query) {
    try {
      const unsplashKey = window.UNSPLASH_KEY || "";
      if (!unsplashKey) {
        console.warn("Unsplash key not configured");
        return [];
      }
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${unsplashKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Unsplash API error:", res.status);
        return [];
      }
      const data = await res.json();
      return data.results ? data.results.map(img => img.urls.regular) : [];
    } catch (err) {
      console.error('Unsplash fetch failed', err);
      return [];
    }
  }

  async function renderTemplates() {
    const grid = $("templateGrid");
    if (!grid) return;

    // Show loading
    const loadingEl = $("loadingTemplates");
    if (loadingEl) loadingEl.style.display = "block";
    grid.innerHTML = "";

    // Get message text for image search
    const messageText = $("messageText") ? $("messageText").value.trim() : "";
    const subjectText = $("subjectText") ? $("subjectText").value.trim() : "";
    const searchQuery = messageText || subjectText || "business event";

    let imageTemplates = [];

    // Try to fetch from Unsplash
    if (window.UNSPLASH_KEY && searchQuery) {
      const unsplashImages = await fetchUnsplashImages(searchQuery);
      if (unsplashImages.length > 0) {
        imageTemplates = unsplashImages.map((url, idx) => ({
          id: idx + 1000, // Use high IDs to avoid conflicts
          title: `תמונה ${idx + 1}`,
          imageUrl: url
        }));
      }
    }

    // Fallback to static templates if no Unsplash results
    if (imageTemplates.length === 0) {
      imageTemplates = templates.length > 0 ? templates : [
        { id: 1, title: "עיצוב 1", imageUrl: "/assets/campaign/design1.jpg" },
        { id: 2, title: "עיצוב 2", imageUrl: "/assets/campaign/design2.jpg" },
        { id: 3, title: "עיצוב 3", imageUrl: "/assets/campaign/design3.jpg" },
        { id: 4, title: "עיצוב 4", imageUrl: "/assets/campaign/design4.jpg" },
        { id: 5, title: "עיצוב 5", imageUrl: "/assets/campaign/design5.jpg" },
      ];
    }

    // Hide loading
    if (loadingEl) loadingEl.style.display = "none";

    grid.innerHTML = imageTemplates.map(t => `
      <div class="imgCard ${selectedTemplateId === t.id ? "selected" : ""}" 
           data-id="${t.id}" 
           data-url="${t.imageUrl || ''}" 
           data-title="${t.title || ''}">
        <img src="${t.imageUrl || '/assets/campaign/design1.jpg'}" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'180\\'%3E%3Crect fill=\\'%23ddd\\' width=\\'200\\' height=\\'180\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' dy=\\'.3em\\'%3E${t.title}%3C/text%3E%3C/svg%3E'" />
        <div class="cap">${t.title}</div>
      </div>
    `).join("");

    grid.querySelectorAll(".imgCard").forEach(card => {
      card.addEventListener("click", () => {
        selectedTemplateId = Number(card.dataset.id);
        selectedTemplateUrl = card.dataset.url;
        selectedTemplateTitle = card.dataset.title;
        
        // Update state
        campaignState.templateId = selectedTemplateId;
        campaignState.templateUrl = selectedTemplateUrl;
        campaignState.templateTitle = selectedTemplateTitle;

        grid.querySelectorAll(".imgCard").forEach(x => x.classList.remove("selected"));
        card.classList.add("selected");

        const img = $("chosenImg");
        if (img) {
          img.src = selectedTemplateUrl;
          img.style.display = "block";
        }
        
        // Update preview if on step 6
        if (document.getElementById("step6") && !document.getElementById("step6").classList.contains("hidden")) {
          updateSummaryAndPreview();
        }
      });
    });
  }

  function bindChannels() {
    document.querySelectorAll(".chip").forEach(c => {
      c.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(x => x.classList.remove("selected"));
        c.classList.add("selected");
        selectedChannel = c.dataset.chan;
        campaignState.channel = selectedChannel;
        
        // Update preview if on step 6
        if (document.getElementById("step6") && !document.getElementById("step6").classList.contains("hidden")) {
          updateSummaryAndPreview();
        }
      });
    });
    const defaultChip = document.querySelector(`.chip[data-chan="${selectedChannel}"]`);
    if (defaultChip) defaultChip.classList.add("selected");
    campaignState.channel = selectedChannel;
  }

  function parseRecipients(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    return lines.map(line => {
      const trimmed = line.trim();
      // Simple parsing: if contains @, it's email; if starts with +, it's phone
      if (trimmed.includes("@")) {
        return { email: trimmed, fullName: "" };
      } else if (trimmed.match(/^\+?[0-9]/)) {
        return { phone: trimmed.replace(/^\+/, ""), fullName: "" };
      } else {
        // Try to split by comma
        const parts = trimmed.split(",").map(p => p.trim());
        return {
          fullName: parts[0] || "",
          email: parts[1] || "",
          phone: parts[2] || ""
        };
      }
    });
  }

  // Button handlers
  $("btnBackDashboard").addEventListener("click", () => {
    location.href = "/client-dashboard.html";
  });

  $("btnGenerateAi").addEventListener("click", generateAIContent);
  
  // Bind option cards - make them clickable
  // Use event delegation since cards are dynamically shown/hidden
  document.addEventListener("click", (e) => {
    const card = e.target.closest(".option-card");
    if (card && !e.target.closest(".option-radio")) {
      const idx = Number(card.dataset.index);
      if (aiOptions && aiOptions[idx]) {
        setSelectedContentOption(idx);
      }
    }
  });

  // Also handle radio button changes
  document.addEventListener("change", (e) => {
    if (e.target.classList.contains("option-radio") && e.target.checked) {
      const idx = Number(e.target.value);
      if (aiOptions && aiOptions[idx]) {
        setSelectedContentOption(idx);
      }
    }
  });

  $("btn1Next").addEventListener("click", async () => {
    const eventIdVal = Number($("eventSelect").value);
    const campaignName = $("campaignName").value.trim();
    
    if (!eventIdVal) {
      alert("אנא בחרי אירוע");
      return;
    }
    if (!campaignName) {
      alert("אנא הזיני שם הודעה");
      return;
    }

    try {
      const created = await api("/client/campaigns", {
        method: "POST",
        body: JSON.stringify({ eventId: eventIdVal, name: campaignName })
      });
      campaignId = created.id;
      eventId = eventIdVal;
      
      // Update state
      campaignState.campaignId = created.id;
      campaignState.eventId = eventIdVal;
      campaignState.campaignName = campaignName;
      
      // Get event details for summary
      const events = await api("/client/events/approved");
      const event = events.find(e => e.id === eventIdVal);
      if (event) {
        eventName = event.name;
        campaignState.eventName = event.name;
        campaignState.eventDate = event.eventDate;
        campaignState.eventTime = event.startTime;
        campaignState.eventLocation = event.location || "";
      } else {
        eventName = `Event #${eventIdVal}`;
        campaignState.eventName = eventName;
      }
      
      setStep(2);
    } catch (err) {
      console.error("Failed to create campaign:", err);
      alert("שגיאה ביצירת הודעה: " + err.message);
    }
  });

  $("btn2Back").addEventListener("click", () => setStep(1));
  $("btn2Next").addEventListener("click", () => {
    if (selectedContentIndex === null && contentOptions.length === 0) {
      alert("אנא בחרי אחת מהאופציות או צרי תוכן חדש עם AI");
      return;
    }
    
    // Use selected AI option if available
    if (selectedContentIndex !== null && aiOptions[selectedContentIndex]) {
      $("subject").value = "עדכון מהאירוע";
      $("messageText").value = aiOptions[selectedContentIndex];
      syncStateFromUI();
    } else if (selectedContentIndex !== null && contentOptions[selectedContentIndex]) {
      // Legacy fallback
      $("subject").value = contentOptions[selectedContentIndex].subject;
      $("messageText").value = contentOptions[selectedContentIndex].text;
      syncStateFromUI();
    }
    
    setStep(3);
  });

  $("btn3Back").addEventListener("click", () => setStep(2));
  $("btn3Next").addEventListener("click", async () => {
    if (!$("messageText").value.trim()) {
      alert("הטקסט ריק");
      return;
    }
    
    syncStateFromUI();
    await loadTemplates();
    setStep(4);
  });

  // Button to search images from Unsplash
  const btnFindImages = $("btnFindImages");
  if (btnFindImages) {
    btnFindImages.addEventListener("click", async () => {
      await renderTemplates();
    });
  }

  $("btn4Back").addEventListener("click", () => setStep(3));
  $("btn4Next").addEventListener("click", async () => {
    if (!selectedTemplateId) {
      alert("אנא בחרי תמונה");
      return;
    }
    
    syncStateFromUI();
    
    // Save template selection
    try {
      await api(`/client/campaigns/${campaignId}/template`, {
        method: "PUT",
        body: JSON.stringify({ templateId: selectedTemplateId })
      });
    } catch (err) {
      console.error("Failed to save template:", err);
    }
    
    setStep(5);
  });

  $("btn5Back").addEventListener("click", () => setStep(4));
  $("btn5Next").addEventListener("click", () => {
    syncStateFromUI();
    setStep(6);
  });

  $("btn6Back").addEventListener("click", () => setStep(5));

  $("btnSend").addEventListener("click", async () => {
    syncStateFromUI();
    
    const recipientsText = $("recipientsList").value.trim();
    if (!recipientsText) {
      alert("אנא הזיני לפחות משתתף אחד");
      return;
    }

    const recipients = parseRecipients(recipientsText);
    if (recipients.length === 0) {
      alert("לא נמצאו משתתפים תקינים");
      return;
    }

    campaignState.recipients = recipients;

    $("btnSend").disabled = true;
    $("sendStatus").innerText = "שולח...";

    try {
      // Add recipients
      await api(`/client/campaigns/${campaignState.campaignId}/recipients`, {
        method: "POST",
        body: JSON.stringify({ recipients: campaignState.recipients })
      });

      // Send campaign using state
      await api(`/client/campaigns/${campaignState.campaignId}/send`, {
        method: "POST",
        body: JSON.stringify({
          channel: campaignState.channel,
          subject: campaignState.subject,
          messageText: campaignState.messageText
        })
      });

      $("sendStatus").innerText = "✅ ההודעה נשלחה בהצלחה!";
      $("sendStatus").style.color = "#10b981";
      
      setTimeout(() => {
        location.href = "/client-dashboard.html";
      }, 2000);
    } catch (err) {
      console.error("Failed to send campaign:", err);
      $("sendStatus").innerText = "❌ שגיאה בשליחה: " + err.message;
      $("sendStatus").style.color = "#ef4444";
      $("btnSend").disabled = false;
    }
  });

  // Preview tab switching
  document.querySelectorAll(".preview-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const previewType = tab.dataset.preview;
      
      // Remove active from all tabs and panes
      document.querySelectorAll(".preview-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".preview-pane").forEach(p => p.classList.remove("active"));
      
      // Add active to clicked tab and corresponding pane
      tab.classList.add("active");
      const pane = $(`previewPane${previewType.toUpperCase()}`);
      if (pane) pane.classList.add("active");
      
      // Render preview for the selected channel
      renderMessagePreview(previewType);
    });
  });

  // Add listeners for automatic updates
  const subjectInput = $("subject");
  const messageInput = $("messageText");
  const recipientsInput = $("recipientsList");

  if (subjectInput) {
    subjectInput.addEventListener("input", () => {
      syncStateFromUI();
      if (document.getElementById("step6") && !document.getElementById("step6").classList.contains("hidden")) {
        updateSummaryAndPreview();
      }
    });
  }

  if (messageInput) {
    messageInput.addEventListener("input", () => {
      syncStateFromUI();
      if (document.getElementById("step6") && !document.getElementById("step6").classList.contains("hidden")) {
        updateSummaryAndPreview();
      }
    });
  }

  if (recipientsInput) {
    recipientsInput.addEventListener("input", () => {
      syncStateFromUI();
      if (document.getElementById("step6") && !document.getElementById("step6").classList.contains("hidden")) {
        updateSummaryAndPreview();
      }
    });
  }


  // Excel upload event listener
  const excelInput = $("recipientsExcel");
  if (excelInput) {
    excelInput.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      try {
        await handleExcelUpload(file);
      } catch (err) {
        console.error(err);
        alert("לא הצלחתי לקרוא את קובץ האקסל. ודאי שזה .xlsx/.xls תקין.");
        const statusEl = $("excelStatus");
        if (statusEl) statusEl.textContent = "";
      } finally {
        // allow uploading same file again
        e.target.value = "";
      }
    });
  }

  // Initialize
  // Hide AI options section initially
  const sec = $("aiOptionsSection");
  if (sec) sec.classList.add("hidden");
  
  loadEvents();
  bindChannels();
  setStep(1);
})();

