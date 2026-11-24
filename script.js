(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  function countTo(el, to, decimals, dur) {
    if (reduce) { el.textContent = to.toFixed(decimals); return; }
    var start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Bottom dock: highlight Calculator while it is on screen ---------- */
  function initDock() {
    var dock = $(".dock"), calc = $("#calculator");
    if (!dock || !calc || !("IntersectionObserver" in window)) return;
    var home = $('.dock a[href="index.html"]');
    var calcLink = $('.dock a[href="index.html#calculator"]');
    if (!home || !calcLink) return;
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        calcLink.classList.toggle("is-active", en.isIntersecting);
        home.classList.toggle("is-active", !en.isIntersecting);
      });
    }, { rootMargin: "-35% 0px -35% 0px" }).observe(calc);
  }

  /* ---------- Scroll: progress, header, back-to-top, parallax ---------- */
  var progress, header, hero, topBtn, ticking = false;

  function makeTopButton() {
    topBtn = doc.createElement("button");
    topBtn.id = "top";
    topBtn.type = "button";
    topBtn.setAttribute("aria-label", "Back to top");
    topBtn.innerHTML = "&#8593;";
    topBtn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    doc.body.appendChild(topBtn);
  }

  function onScroll() {
    var y = window.pageYOffset || root.scrollTop;
    var h = root.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    if (header) header.classList.toggle("scrolled", y > 20);
    if (topBtn) topBtn.classList.toggle("show", y > 500);
    if (hero && !reduce && y < 900) hero.style.setProperty("--sy", (y * 0.2) + "px");
    ticking = false;
  }

  function initScroll() {
    progress = $("#progress");
    header = $(".site-header");
    hero = $(".hero, .page-hero");
    makeTopButton();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  /* ---------- Hero: word-by-word headline + mouse parallax ---------- */
  function initHero() {
    if (!hero) return;
    var h1 = $("h1", hero);
    if (h1 && !reduce) {
      var hl = parseInt(h1.getAttribute("data-hl") || "0", 10);
      var words = h1.textContent.trim().split(/\s+/);
      h1.textContent = "";
      words.forEach(function (w, i) {
        var s = doc.createElement("span");
        s.className = "w" + (hl && i >= words.length - hl ? " hl" : "");
        s.style.animationDelay = (0.1 + i * 0.09) + "s";
        s.textContent = w;
        h1.appendChild(s);
        if (i < words.length - 1) h1.appendChild(doc.createTextNode(" "));
      });
    } else if (h1 && reduce) {
      var n = parseInt(h1.getAttribute("data-hl") || "0", 10);
      if (n) {
        var ws = h1.textContent.trim().split(/\s+/);
        h1.innerHTML = ws.slice(0, ws.length - n).join(" ") + ' <span class="hl">' + ws.slice(ws.length - n).join(" ") + "</span>";
      }
    }
    if (!reduce && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 36) + "px");
        hero.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 26) + "px");
      });
    }
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;
    var sel = "main h2, main .sec-head p, main .eyebrow, main .pills, main .stat-i, main .row, main .ncard, main .tip, main .panel, main .tabs, main details, main .table-wrap, main .closing .btn";
    var all = $$(sel).filter(function (el) { return !el.closest(".hero") && !el.closest(".results") && !el.closest(".page-hero"); });
    var targets = all.filter(function (el) {
      return !all.some(function (o) { return o !== el && o.contains(el); });
    });
    var seen = new Map();
    targets.forEach(function (el) {
      var n = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, n + 1);
      el.classList.add("reveal");
      if (el.matches("h2")) el.classList.add("from-left");
      else if (el.matches(".ncard, .tip, .stat-i")) el.classList.add("zoom");
      var stagger = el.parentNode.matches(".ngrid, .tips, .stats, .pills") ? n * 0.09 : 0;
      el.style.setProperty("--d", stagger + "s");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el) {
      el.addEventListener("transitionend", function (e) {
        if (e.target === el && e.propertyName === "opacity") {
          el.classList.remove("reveal", "in", "from-left", "zoom");
          el.style.removeProperty("--d");
        }
      });
      io.observe(el);
    });
  }

  /* ---------- Count-up numbers ---------- */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || reduce || !("IntersectionObserver" in window)) return;
    els.forEach(function (el) { el.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          countTo(en.target, parseFloat(en.target.getAttribute("data-count")), 0, 1500);
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Card glow follows mouse ---------- */
  function initGlow() {
    if (reduce) return;
    $$(".ncard").forEach(function (c) {
      c.addEventListener("mousemove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Filter tabs (foods, workouts) ---------- */
  function initTabs() {
    $$(".tabs[data-target]").forEach(function (tabs) {
      var scope = $(tabs.getAttribute("data-target"));
      if (!scope) return;
      var items = $$("[data-cat]", scope);
      var buttons = $$("button", tabs);
      buttons.forEach(function (b) {
        b.addEventListener("click", function () {
          var f = b.getAttribute("data-filter");
          buttons.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          items.forEach(function (it) { it.hidden = !(f === "all" || it.getAttribute("data-cat") === f); });
        });
      });
    });
  }

  /* ---------- Calculator ---------- */
  function initCalculator() {
    var form = doc.getElementById("calc-form");
    if (!form) return;
    function setVal(id, val, d) { countTo(doc.getElementById(id), val, d || 0, 1100); }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = doc.getElementById("calc-msg");
      var gender = doc.getElementById("gender").value;
      var age = parseFloat(doc.getElementById("age").value);
      var height = parseFloat(doc.getElementById("height").value);
      var weight = parseFloat(doc.getElementById("weight").value);
      var activity = parseFloat(doc.getElementById("activity").value);
      var goal = doc.getElementById("goal").value;

      if (!age || !height || !weight) {
        msg.textContent = "Please fill in your age, height and weight.";
        return;
      }
      msg.textContent = "";

      // Mifflin-St Jeor equation
      var bmr = 10 * weight + 6.25 * height - 5 * age + (gender === "male" ? 5 : -161);
      var tdee = bmr * activity;
      var calories = tdee, perKg = 1.8;
      if (goal === "lose") { calories = tdee - 400; perKg = 2.0; }
      if (goal === "gain") { calories = tdee + 300; perKg = 1.8; }
      var protein = perKg * weight;
      var fat = (calories * 0.25) / 9;
      var carbs = Math.max((calories - protein * 4 - fat * 9) / 4, 0);
      var bmi = weight / Math.pow(height / 100, 2);

      var res = doc.getElementById("results");
      res.style.display = "block";
      res.classList.remove("show");
      void res.offsetWidth;
      res.classList.add("show");
      $$(".stat", res).forEach(function (s, i) { s.style.animationDelay = (i * 0.07) + "s"; });

      setVal("r-bmr", Math.round(bmr));
      setVal("r-tdee", Math.round(tdee));
      setVal("r-cal", Math.round(calories));
      setVal("r-pro", Math.round(protein));
      setVal("r-carb", Math.round(carbs));
      setVal("r-fat", Math.round(fat));
      setVal("r-bmi", bmi, 1);
      res.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    });
  }

  function init() {
    initDock();
    initScroll();
    initHero();
    initReveal();
    initCounters();
    initGlow();
    initTabs();
    initCalculator();
  }

  if (doc.readyState !== "loading") init();
  else doc.addEventListener("DOMContentLoaded", init);
})();
