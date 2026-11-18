(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }

  // Smooth number count-up
  function countTo(el, to, decimals, dur) {
    if (reduce) { el.textContent = to.toFixed(decimals); return; }
    var start = null;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = (to * e).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var progress, header, hero, topBtn;

  /* ---------- Scroll: progress bar, sticky header, back to top, hero parallax ---------- */
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

  var ticking = false;
  function onScroll() {
    var y = window.pageYOffset || root.scrollTop;
    var h = root.scrollHeight - window.innerHeight;
    if (progress) progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
    if (header) header.classList.toggle("scrolled", y > 20);
    if (topBtn) topBtn.classList.toggle("show", y > 500);
    if (hero && !reduce && y < 900) hero.style.setProperty("--sy", (y * 0.25) + "px");
    ticking = false;
  }

  function initScroll() {
    progress = $("#progress");
    header = $("header");
    makeTopButton();
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  /* ---------- Hero: floating blobs, word-by-word headline, mouse parallax ---------- */
  function initHero() {
    hero = $(".hero");
    if (!hero) return;

    var blobs = doc.createElement("div");
    blobs.className = "blobs";
    blobs.setAttribute("aria-hidden", "true");
    blobs.innerHTML = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>';
    hero.insertBefore(blobs, hero.firstChild);

    var h1 = $("h1", hero);
    if (h1 && !reduce) {
      var words = h1.textContent.trim().split(/\s+/);
      h1.textContent = "";
      words.forEach(function (w, i) {
        var s = doc.createElement("span");
        s.className = "w";
        s.style.animationDelay = (0.1 + i * 0.08) + "s";
        s.textContent = w;
        h1.appendChild(s);
        if (i < words.length - 1) h1.appendChild(doc.createTextNode(" "));
      });
    }

    if (!reduce && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
      hero.addEventListener("mousemove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        hero.style.setProperty("--px", (x * 40) + "px");
        hero.style.setProperty("--py", (y * 30) + "px");
      });
    }
  }

  /* ---------- Rotating word in hero ---------- */
  function initRotator() {
    var el = $("#rotator");
    if (!el || reduce) return;
    var words = ["calories", "protein", "carbs", "fats"];
    var i = 0;
    setInterval(function () {
      el.classList.add("out");
      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("out");
      }, 350);
    }, 2200);
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    if (reduce || !("IntersectionObserver" in window)) return;

    var sel = "main h2, main h3, main > p, main > ul, main > ol, main .card, main details, main .table-wrap, main .sitem, main .cta";
    var all = $$(sel).filter(function (el) { return !el.closest(".results"); });
    var targets = all.filter(function (el) {
      return !all.some(function (o) { return o !== el && o.contains(el); });
    });

    var seen = new Map();
    targets.forEach(function (el) {
      var n = seen.get(el.parentNode) || 0;
      seen.set(el.parentNode, n + 1);
      el.classList.add("reveal");
      if (el.matches("h2, h3")) el.classList.add("from-left");
      else if (el.matches(".card, .sitem")) el.classList.add("zoom");
      var stagger = el.parentNode.matches(".grid, .stats-inner") ? n * 0.1 : 0;
      el.style.setProperty("--d", stagger + "s");
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    targets.forEach(function (el) {
      // After the reveal finishes, hand control back to normal hover styles
      el.addEventListener("transitionend", function (e) {
        if (e.target === el && e.propertyName === "opacity") {
          el.classList.remove("reveal", "in", "from-left", "zoom");
          el.style.removeProperty("--d");
        }
      });
      io.observe(el);
    });
  }

  /* ---------- Count-up numbers when visible ---------- */
  function initCounters() {
    var els = $$("[data-count]");
    if (!els.length || reduce || !("IntersectionObserver" in window)) return;
    els.forEach(function (el) { el.textContent = "0"; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var el = en.target;
          countTo(el, parseFloat(el.getAttribute("data-count")), 0, 1500);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Card glow follows the mouse ---------- */
  function initGlow() {
    if (reduce) return;
    $$(".card").forEach(function (c) {
      c.addEventListener("mousemove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Calculator ---------- */
  function initCalculator() {
    var form = doc.getElementById("calc-form");
    if (!form) return;

    function setVal(id, val, decimals) {
      countTo(doc.getElementById(id), val, decimals || 0, 1100);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var gender = doc.getElementById("gender").value;
      var age = parseFloat(doc.getElementById("age").value);
      var height = parseFloat(doc.getElementById("height").value);
      var weight = parseFloat(doc.getElementById("weight").value);
      var activity = parseFloat(doc.getElementById("activity").value);
      var goal = doc.getElementById("goal").value;

      if (!age || !height || !weight) {
        alert("Please fill in age, height and weight.");
        return;
      }

      // Mifflin-St Jeor equation
      var bmr = 10 * weight + 6.25 * height - 5 * age + (gender === "male" ? 5 : -161);
      var tdee = bmr * activity;

      var calories = tdee;
      var proteinPerKg = 1.8;
      if (goal === "lose") { calories = tdee - 400; proteinPerKg = 2.0; }
      if (goal === "gain") { calories = tdee + 300; proteinPerKg = 1.8; }

      var protein = proteinPerKg * weight;
      var fat = (calories * 0.25) / 9;
      var carbs = (calories - protein * 4 - fat * 9) / 4;
      if (carbs < 0) carbs = 0;
      var bmi = weight / Math.pow(height / 100, 2);

      var res = doc.getElementById("results");
      res.style.display = "block";
      res.classList.remove("show");
      void res.offsetWidth; // restart the pop animation
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
    initScroll();
    initHero();
    initRotator();
    initReveal();
    initCounters();
    initGlow();
    initCalculator();
  }

  if (doc.readyState !== "loading") init();
  else doc.addEventListener("DOMContentLoaded", init);
})();
