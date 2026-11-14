(function () {
  "use strict";

  // Deployed Worker URL (see chatbot-worker/README.md).
  var CHAT_API_BASE = "https://stewart-co-chatbot.jordan-574.workers.dev";

  var PHONE = "(902) 580-2665";

  var OPENING_MESSAGE =
    "Hi! 👋 Ask about interior or exterior painting, cabinets, staining, or magnetic, dry erase and chalkboard walls. Estimates are free. Easiest of all: call Dan at " + PHONE + ".";

  var QUICK_OPTIONS = [
    { label: "Cabinet painting", prompt: "Do you paint kitchen cabinets?" },
    { label: "Dry erase walls", prompt: "Can you do a magnetic dry erase wall?" },
    { label: "Where do you work?", prompt: "What areas do you serve?" },
    { label: "Get a quote", action: "lead-form" },
  ];

  // Leads go to the same Formspree form as the page's quote form, straight
  // from the visitor's browser. The form ID is public by design.
  var FORMSPREE_URL = "https://formspree.io/f/xaqlwyrr";

  function clip(value, max) {
    return String(value || "").trim().slice(0, max);
  }

  // lead: { name, email, phone, address, type, description, transcript, check_field }
  function sendLead(lead) {
    if (lead.check_field) return Promise.resolve(); // honeypot filled: quietly drop
    var type = clip(lead.type, 100) || "General question";
    var name = clip(lead.name, 200);
    var body = {
      _subject: "New chat quote request: " + type + " | " + name,
      Source: "Website chat assistant",
      name: name,
      phone: clip(lead.phone, 50) || "Not provided",
      email: clip(lead.email, 200) || "Not provided",
      "Job address": clip(lead.address, 300) || "Not provided",
      service: type,
      message: clip(lead.description, 2000) || "No additional details provided.",
      Conversation: clip(lead.transcript, 8000) || "(no chat messages before this form was submitted)",
    };
    return fetch(FORMSPREE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    }).then(function (res) {
      if (!res.ok) throw new Error("Send failed");
    });
  }

  var messages = [];
  var hasOpenedBefore = false;
  var isSending = false;

  function getSessionId() {
    try {
      var id = sessionStorage.getItem("scChatSessionId");
      if (!id) {
        id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
        sessionStorage.setItem("scChatSessionId", id);
      }
      return id;
    } catch (e) {
      return "";
    }
  }

  var root = document.createElement("div");
  root.innerHTML =
    '<button id="cc-chat-toggle" type="button" aria-expanded="false" aria-controls="cc-chat-panel" aria-label="Chat with the Stewart &amp; Co. assistant">' +
    '<svg class="cc-chat-open-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' +
    '<svg class="cc-chat-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
    "<span>Ask us anything</span>" +
    "</button>" +
    '<div id="cc-chat-panel" role="dialog" aria-label="Stewart and Co. assistant chat" aria-hidden="true">' +
    '<div class="cc-chat-header">' +
    "<div>" +
    "<h2>Stewart &amp; Co. Assistant</h2>" +
    "<p>Automated helper for quick questions. For a price or a start date, call Dan at " + PHONE + ".</p>" +
    "</div>" +
    '<button type="button" class="cc-chat-header-close" aria-label="Close chat"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg></button>' +
    "</div>" +
    '<div id="cc-chat-body"></div>' +
    "</div>";

  document.body.appendChild(root);

  var toggleBtn = document.getElementById("cc-chat-toggle");
  var panel = document.getElementById("cc-chat-panel");
  var closeBtn = panel.querySelector(".cc-chat-header-close");
  var body = document.getElementById("cc-chat-body");

  function renderChatView() {
    body.innerHTML =
      '<div class="cc-chat-messages" id="cc-chat-messages" aria-live="polite"></div>' +
      '<div class="cc-chat-quick-options" id="cc-chat-quick-options"></div>' +
      '<div class="cc-chat-footer">' +
      '<form id="cc-chat-form" class="cc-chat-input-row">' +
      '<input type="text" id="cc-chat-input" placeholder="Type your question…" aria-label="Type your question" autocomplete="off">' +
      '<button type="submit" class="cc-chat-send" aria-label="Send message"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg></button>' +
      "</form>" +
      '<p class="cc-chat-alt-action">Rather leave your details? <button type="button" id="cc-chat-alt-btn">Get a quote →</button></p>' +
      "</div>";

    var messagesEl = document.getElementById("cc-chat-messages");
    messages.forEach(function (m) {
      appendBubble(messagesEl, m.role, m.content);
    });

    if (messages.length <= 1) {
      renderQuickOptions();
    }

    document.getElementById("cc-chat-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("cc-chat-input");
      var text = input.value.trim();
      if (!text || isSending) return;
      input.value = "";
      sendUserMessage(text);
    });

    document.getElementById("cc-chat-alt-btn").addEventListener("click", renderLeadForm);

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderQuickOptions() {
    var container = document.getElementById("cc-chat-quick-options");
    if (!container) return;
    container.innerHTML = "";
    QUICK_OPTIONS.forEach(function (opt) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cc-chat-quick-btn";
      btn.textContent = opt.label;
      btn.addEventListener("click", function () {
        container.innerHTML = "";
        if (opt.action === "lead-form") {
          renderLeadForm();
        } else {
          sendUserMessage(opt.prompt);
        }
      });
      container.appendChild(btn);
    });
  }

  function appendBubble(container, role, text) {
    var bubble = document.createElement("div");
    bubble.className = "cc-chat-bubble " + (role === "user" ? "user" : "bot");
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  function sendUserMessage(text) {
    var messagesEl = document.getElementById("cc-chat-messages");
    messages.push({ role: "user", content: text });
    appendBubble(messagesEl, "user", text);

    var typing = document.createElement("div");
    typing.className = "cc-chat-typing";
    typing.id = "cc-chat-typing";
    typing.setAttribute("aria-label", "The assistant is typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    messagesEl.appendChild(typing);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    isSending = true;

    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timeoutId = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;

    fetch(CHAT_API_BASE + "/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages, sessionId: getSessionId() }),
      signal: controller ? controller.signal : undefined,
    })
      .then(function (res) {
        if (timeoutId) clearTimeout(timeoutId);
        if (!res.ok) throw new Error("bad response");
        return res.json();
      })
      .then(function (data) {
        var typingEl = document.getElementById("cc-chat-typing");
        if (typingEl) typingEl.remove();
        var reply = data.reply || "Sorry, I didn't catch that. Could you rephrase?";
        messages.push({ role: "assistant", content: reply });
        appendBubble(messagesEl, "assistant", reply);
      })
      .catch(function () {
        if (timeoutId) clearTimeout(timeoutId);
        var typingEl = document.getElementById("cc-chat-typing");
        if (typingEl) typingEl.remove();
        appendBubble(messagesEl, "assistant", "Sorry, we're having trouble connecting right now. Please call " + PHONE + ".");
      })
      .finally(function () {
        isSending = false;
      });
  }

  function renderLeadForm() {
    body.innerHTML =
      '<div class="cc-chat-subbar"><button type="button" class="cc-chat-back" id="cc-chat-back-btn">← Back to chat</button></div>' +
      '<form class="cc-chat-lead-form" id="cc-chat-lead-form">' +
      '<div id="cc-chat-lead-error" class="cc-chat-lead-error" aria-live="polite"></div>' +
      '<div><label for="cc-lead-name">Name</label><input id="cc-lead-name" name="name" type="text" autocomplete="name" required></div>' +
      '<div><label for="cc-lead-phone">Phone</label><input id="cc-lead-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required></div>' +
      '<div><label for="cc-lead-email">Email (optional)</label><input id="cc-lead-email" name="email" type="email" inputmode="email" autocomplete="email"></div>' +
      '<div><label for="cc-lead-address">Address of the job</label><input id="cc-lead-address" name="address" type="text" autocomplete="street-address" required></div>' +
      '<div><label for="cc-lead-type">What do you need?</label>' +
      '<select id="cc-lead-type" name="type">' +
      "<option>Interior painting</option>" +
      "<option>Exterior painting</option>" +
      "<option>Cabinet painting</option>" +
      "<option>Staining or varnishing</option>" +
      "<option>Magnetic, dry erase or chalkboard wall</option>" +
      "<option>Epoxy coating</option>" +
      "<option>Something else</option>" +
      "</select></div>" +
      '<div><label for="cc-lead-desc">Tell us about the job (rooms, surfaces, colours)</label><textarea id="cc-lead-desc" name="description"></textarea></div>' +
      '<div class="cc-chat-lead-honeypot" aria-hidden="true"><label for="cc-lead-check">Leave this field empty</label><input id="cc-lead-check" name="check_field" type="text" tabindex="-1" autocomplete="off"></div>' +
      '<button type="submit" class="cc-chat-lead-submit">Send my request</button>' +
      "</form>";

    document.getElementById("cc-chat-back-btn").addEventListener("click", renderChatView);

    document.getElementById("cc-chat-lead-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.target;
      var errorEl = document.getElementById("cc-chat-lead-error");
      errorEl.textContent = "";

      var payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        address: form.address.value.trim(),
        type: form.type.value,
        description: form.description.value.trim(),
        check_field: form.check_field.value,
        transcript: messages.map(function (m) { return m.role + ": " + m.content; }).join("\n"),
      };

      var submitBtn = form.querySelector(".cc-chat-lead-submit");
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending…";

      sendLead(payload)
        .then(renderLeadSuccess)
        .catch(function () {
          errorEl.textContent = "Sorry, that didn't go through. Please call " + PHONE + ".";
          submitBtn.disabled = false;
          submitBtn.textContent = "Send my request";
        });
    });

    document.getElementById("cc-lead-name").focus();
  }

  function renderLeadSuccess() {
    body.innerHTML =
      '<div class="cc-chat-subbar"><button type="button" class="cc-chat-back" id="cc-chat-back-btn-2">← Back to chat</button></div>' +
      '<div class="cc-chat-lead-success" role="status">' +
      "<p>Thanks! Dan has your details and will get back to you about a free estimate. In a hurry? Call " + PHONE + ".</p>" +
      "</div>";
    document.getElementById("cc-chat-back-btn-2").addEventListener("click", renderChatView);
  }

  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    toggleBtn.setAttribute("aria-expanded", "true");

    if (!hasOpenedBefore) {
      hasOpenedBefore = true;
      messages.push({ role: "assistant", content: OPENING_MESSAGE });
      renderChatView();
    }

    // Flush styles so the panel counts as visible before moving focus into it
    void panel.offsetHeight;
    var input = document.getElementById("cc-chat-input");
    if (input) input.focus();
  }

  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.focus();
  }

  toggleBtn.addEventListener("click", function () {
    if (panel.classList.contains("open")) {
      closePanel();
    } else {
      openPanel();
    }
  });

  closeBtn.addEventListener("click", closePanel);

  // Lets the page's quote form reuse the same lead delivery
  window.StewartChat = { sendLead: sendLead };

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) {
      closePanel();
    }
  });
})();
