/* GLITCH — JavaScript commun (vanilla, aucune dépendance) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- Header : état au scroll + menu burger ---------- */
  var header = $(".site-header");
  var toggle = $(".nav-toggle");

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setMenu(open) {
    if (!header || !toggle) return;
    header.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  }
  if (toggle) {
    toggle.addEventListener("click", function () {
      setMenu(!header.classList.contains("is-open"));
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && header.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
    $$(".primary-nav a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    window.matchMedia("(min-width: 960px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Photos : repli propre si une image ne charge pas ---------- */
  $$(".ph img").forEach(function (img) {
    function broken() { img.closest(".ph").classList.add("is-broken"); }
    img.addEventListener("error", broken);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) broken();
  });

  /* ---------- Apparition au scroll ---------- */
  var reveals = $$(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---------- Compteurs animés ---------- */
  var nf = new Intl.NumberFormat("fr-FR");
  function renderCount(el, value) {
    el.textContent = nf.format(Math.round(value)) + (el.getAttribute("data-suffix") || "");
  }
  function runCount(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (reduceMotion) { renderCount(el, target); return; }
    var duration = 1800;
    var start = null;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      renderCount(el, target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$("[data-count]");
  if (counters.length) {
    if ("IntersectionObserver" in window) {
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { runCount(entry.target); co.unobserve(entry.target); }
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { co.observe(el); });
    } else {
      counters.forEach(function (el) { renderCount(el, parseFloat(el.getAttribute("data-count"))); });
    }
  }

  /* ---------- FAQ en accordéon ---------- */
  $$(".faq-item").forEach(function (item) {
    var btn = $(".faq-q", item);
    var panel = $(".faq-a", item);
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = !item.classList.contains("is-open");
      item.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      panel.setAttribute("aria-hidden", String(!open));
    });
  });

  /* ---------- Horaires : mise en évidence du jour ---------- */
  var rows = $$("[data-days]");
  if (rows.length) {
    var today = new Date().getDay(); // 0 = dimanche
    rows.forEach(function (row) {
      var days = row.getAttribute("data-days").split(",").map(Number);
      if (days.indexOf(today) !== -1) row.classList.add("is-today");
    });
  }

  /* ---------- Validation de formulaires ---------- */
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RE_PHONE = /^(?:(?:\+|00)33\s?|0)[1-9](?:[\s.\-]?\d{2}){4}$/;

  function fieldWrap(input) { return input.closest(".field"); }

  function setError(input, message) {
    var wrap = fieldWrap(input);
    if (!wrap) return;
    var err = $(".field-error", wrap);
    wrap.classList.toggle("has-error", !!message);
    if (err) err.textContent = message || "";
    var controls = $$("input, select, textarea", wrap);
    controls.forEach(function (c) {
      if (message) c.setAttribute("aria-invalid", "true");
      else c.removeAttribute("aria-invalid");
    });
  }

  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDate(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  /* Horaires d'ouverture : premier créneau et dernier créneau réservable (en minutes) */
  var OPENING = {
    0: { open: 11 * 60, last: 22 * 60, label: "le dimanche" },
    1: { open: 14 * 60, last: 23 * 60, label: "en semaine" },
    2: { open: 14 * 60, last: 23 * 60, label: "en semaine" },
    3: { open: 14 * 60, last: 23 * 60, label: "en semaine" },
    4: { open: 14 * 60, last: 23 * 60, label: "en semaine" },
    5: { open: 14 * 60, last: 23 * 60 + 30, label: "le vendredi" },
    6: { open: 11 * 60, last: 23 * 60 + 30, label: "le samedi" }
  };
  function fmt(mins) { return Math.floor(mins / 60) + "h" + (mins % 60 ? pad(mins % 60) : ""); }

  var FORMULAS = {
    session: { name: "Session à l’heure", price: "7 € / h par poste PC · 8 € / h par console PS5" },
    soiree: { name: "Forfait Soirée (4 h)", price: "22 € par joueur" },
    pack: { name: "Pack Entre Potes (3 h, 4 joueurs)", price: "54 € pour 4 joueurs" },
    journee: { name: "Forfait Journée (9 h)", price: "39 € par joueur" },
    etudiant: { name: "Tarif étudiant", price: "5,50 € / h par poste PC" },
    anniversaire: { name: "Anniversaire (3 h, jusqu’à 8 joueurs)", price: "À partir de 149 €" },
    tournoi: { name: "Inscription à un tournoi", price: "10 € par joueur" }
  };

  function attachLiveValidation(form, validators) {
    Object.keys(validators).forEach(function (name) {
      var els = $$('[name="' + name + '"]', form);
      els.forEach(function (el) {
        var evt = (el.tagName === "SELECT" || el.type === "radio" || el.type === "checkbox") ? "change" : "blur";
        el.addEventListener(evt, function () { validators[name](); });
        if (evt === "blur") {
          el.addEventListener("input", function () {
            if (fieldWrap(el).classList.contains("has-error")) validators[name]();
          });
        }
      });
    });
  }

  function runAll(form, validators) {
    var firstBad = null;
    Object.keys(validators).forEach(function (name) {
      var ok = validators[name]();
      if (!ok && !firstBad) firstBad = $('[name="' + name + '"]', form);
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* ---------- Page Réservation ---------- */
  var resForm = $("#reservation-form");
  if (resForm) {
    var f = resForm.elements;
    var dateInput = f.date;
    var now = new Date();
    var maxDate = new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
    dateInput.min = isoDate(now);
    dateInput.max = isoDate(maxDate);

    // Pré-sélection depuis un lien (?formule=pack&espace=ps5)
    try {
      var params = new URLSearchParams(window.location.search);
      var pf = params.get("formule");
      if (pf && FORMULAS[pf]) f.formule.value = pf;
      var pe = params.get("espace");
      if (pe === "pc" || pe === "ps5") {
        var radio = $('input[name="espace"][value="' + pe + '"]', resForm);
        if (radio) radio.checked = true;
      }
    } catch (e) { /* URLSearchParams indisponible : on ignore */ }

    var parseDate = function (value) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!m) return null;
      var d = new Date(+m[1], +m[2] - 1, +m[3]);
      return isNaN(d.getTime()) ? null : d;
    };

    var vRes = {
      nom: function () {
        var v = f.nom.value.trim();
        if (!v) return setError(f.nom, "Dis-nous comment t’appeler."), false;
        if (v.length < 2) return setError(f.nom, "Ton nom doit faire au moins 2 caractères."), false;
        return setError(f.nom, ""), true;
      },
      email: function () {
        var v = f.email.value.trim();
        if (!v) return setError(f.email, "Indique ton adresse e-mail pour recevoir la confirmation."), false;
        if (!RE_EMAIL.test(v)) return setError(f.email, "Cette adresse e-mail n’a pas l’air valide (ex. toi@exemple.fr)."), false;
        return setError(f.email, ""), true;
      },
      telephone: function () {
        var v = f.telephone.value.trim();
        if (!v) return setError(f.telephone, "Ajoute un numéro pour qu’on puisse te joindre."), false;
        if (!RE_PHONE.test(v)) return setError(f.telephone, "Numéro invalide. Format attendu : 06 12 34 56 78."), false;
        return setError(f.telephone, ""), true;
      },
      date: function () {
        var v = f.date.value;
        if (!v) return setError(f.date, "Choisis une date de venue."), false;
        var d = parseDate(v);
        if (!d) return setError(f.date, "Cette date n’est pas valide."), false;
        var today = new Date(); today.setHours(0, 0, 0, 0);
        if (d < today) return setError(f.date, "Cette date est déjà passée. Choisis aujourd’hui ou plus tard."), false;
        if (d > maxDate) return setError(f.date, "On ouvre les réservations jusqu’à 6 mois à l’avance."), false;
        setError(f.date, "");
        if (f.heure.value) vRes.heure();
        return true;
      },
      heure: function () {
        var v = f.heure.value;
        if (!v) return setError(f.heure, "Choisis ton heure d’arrivée."), false;
        var parts = v.split(":");
        var mins = (+parts[0]) * 60 + (+parts[1]);
        var d = parseDate(f.date.value);
        if (d) {
          var h = OPENING[d.getDay()];
          if (mins < h.open) return setError(f.heure, "On ouvre à " + fmt(h.open) + " " + h.label + ". Choisis un créneau plus tard."), false;
          if (mins > h.last) return setError(f.heure, "Dernier créneau " + h.label + " : " + fmt(h.last) + "."), false;
          var t = new Date();
          if (isoDate(t) === f.date.value && mins <= t.getHours() * 60 + t.getMinutes()) {
            return setError(f.heure, "Ce créneau est déjà passé. Choisis une heure plus tard."), false;
          }
        }
        return setError(f.heure, ""), true;
      },
      joueurs: function () {
        var raw = f.joueurs.value.trim();
        if (!raw) return setError(f.joueurs, "Combien êtes-vous ? (de 1 à 12)"), false;
        var n = Number(raw);
        if (!Number.isInteger(n) || n < 1) return setError(f.joueurs, "Entre un nombre entier de joueurs, au minimum 1."), false;
        if (n > 12) return setError(f.joueurs, "Au-delà de 12 joueurs, passe par la privatisation (voir la page Événements)."), false;
        var espace = (resForm.querySelector('input[name="espace"]:checked') || {}).value;
        if (espace === "ps5" && n > 8) return setError(f.joueurs, "L’espace PS5 accueille 8 joueurs maximum (2 consoles × 4)."), false;
        if (f.formule.value === "pack" && n !== 4) return setError(f.joueurs, "Le Pack Entre Potes est prévu pour 4 joueurs exactement."), false;
        if (f.formule.value === "anniversaire" && n > 8) return setError(f.joueurs, "La formule anniversaire accueille 8 joueurs maximum."), false;
        return setError(f.joueurs, ""), true;
      },
      espace: function () {
        var chosen = resForm.querySelector('input[name="espace"]:checked');
        var first = $('input[name="espace"]', resForm);
        if (!chosen) return setError(first, "Choisis ton espace : PC ou PS5."), false;
        setError(first, "");
        if (f.joueurs.value) vRes.joueurs();
        return true;
      },
      formule: function () {
        if (!f.formule.value) return setError(f.formule, "Sélectionne la formule qui te convient."), false;
        setError(f.formule, "");
        if (f.joueurs.value) vRes.joueurs();
        return true;
      },
      message: function () {
        if (f.message.value.length > 400) return setError(f.message, "Ton message dépasse 400 caractères (" + f.message.value.length + ")."), false;
        return setError(f.message, ""), true;
      },
      consent: function () {
        if (!f.consent.checked) return setError(f.consent, "Coche la case pour valider ta demande."), false;
        return setError(f.consent, ""), true;
      }
    };
    attachLiveValidation(resForm, vRes);

    var confirmBox = $("#reservation-confirm");
    var formBox = $("#reservation-card");

    var weekdays = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
    var months = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

    resForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!runAll(resForm, vRes)) return;

      var d = parseDate(f.date.value);
      var espace = resForm.querySelector('input[name="espace"]:checked').value;
      var formula = FORMULAS[f.formule.value];
      var code = "GLT-" + Math.random().toString(36).slice(2, 8).toUpperCase();
      var n = Number(f.joueurs.value);
      var prenom = f.nom.value.trim().split(/\s+/)[0];

      $("#confirm-name").textContent = prenom;
      $("#confirm-ref").textContent = code;
      $("#confirm-mail").textContent = f.email.value.trim();

      var data = [
        ["Nom", f.nom.value.trim()],
        ["Date", weekdays[d.getDay()] + " " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear()],
        ["Arrivée", f.heure.value.replace(":", "h")],
        ["Espace", espace === "pc" ? "Espace PC gaming" : "Espace PS5 & canapés"],
        ["Joueurs", n + (n > 1 ? " joueurs" : " joueur")],
        ["Formule", formula.name],
        ["Tarif indicatif", formula.price],
        ["Téléphone", f.telephone.value.trim()]
      ];
      var msg = f.message.value.trim();
      if (msg) data.push(["Message", msg]);

      var dl = $("#confirm-recap");
      dl.textContent = "";
      data.forEach(function (row) {
        var wrap = document.createElement("div");
        var dt = document.createElement("dt");
        var dd = document.createElement("dd");
        dt.textContent = row[0];
        dd.textContent = row[1];
        wrap.appendChild(dt);
        wrap.appendChild(dd);
        dl.appendChild(wrap);
      });

      formBox.hidden = true;
      confirmBox.classList.add("is-visible");
      confirmBox.hidden = false;
      var title = $("h2", confirmBox);
      title.setAttribute("tabindex", "-1");
      title.focus({ preventScroll: true });
      confirmBox.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });

    var again = $("#reservation-again");
    if (again) {
      again.addEventListener("click", function () {
        resForm.reset();
        $$(".field", resForm).forEach(function (w) { w.classList.remove("has-error"); });
        $$("[aria-invalid]", resForm).forEach(function (c) { c.removeAttribute("aria-invalid"); });
        confirmBox.classList.remove("is-visible");
        confirmBox.hidden = true;
        formBox.hidden = false;
        f.nom.focus();
      });
    }
  }

  /* ---------- Page Contact : formulaire factice ---------- */
  var contactForm = $("#contact-form");
  if (contactForm) {
    var c = contactForm.elements;
    var vContact = {
      nom: function () {
        var v = c.nom.value.trim();
        if (!v) return setError(c.nom, "Dis-nous comment t’appeler."), false;
        if (v.length < 2) return setError(c.nom, "Ton nom doit faire au moins 2 caractères."), false;
        return setError(c.nom, ""), true;
      },
      email: function () {
        var v = c.email.value.trim();
        if (!v) return setError(c.email, "Indique ton adresse e-mail pour qu’on te réponde."), false;
        if (!RE_EMAIL.test(v)) return setError(c.email, "Cette adresse e-mail n’a pas l’air valide (ex. toi@exemple.fr)."), false;
        return setError(c.email, ""), true;
      },
      sujet: function () {
        if (!c.sujet.value) return setError(c.sujet, "Choisis le sujet de ton message."), false;
        return setError(c.sujet, ""), true;
      },
      message: function () {
        var v = c.message.value.trim();
        if (v.length < 10) return setError(c.message, "Écris-nous au moins 10 caractères pour qu’on comprenne ta demande."), false;
        if (v.length > 800) return setError(c.message, "Ton message dépasse 800 caractères."), false;
        return setError(c.message, ""), true;
      }
    };
    attachLiveValidation(contactForm, vContact);
    var okBox = $("#contact-success");
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      okBox.classList.remove("is-visible");
      if (!runAll(contactForm, vContact)) return;
      var prenom = c.nom.value.trim().split(/\s+/)[0];
      $("#contact-success-name").textContent = prenom;
      contactForm.reset();
      okBox.classList.add("is-visible");
      okBox.setAttribute("tabindex", "-1");
      okBox.focus();
    });
  }
})();
