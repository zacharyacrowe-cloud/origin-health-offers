/* pixel-events v2: hold tel/sms navigation, iframe interact, beacon+eventID dedupe */
(function () {
  var PIXEL_ID = "791773248585047";
  var offer = (document.body && document.body.getAttribute("data-offer")) || "unknown";
  var scheduleSent = false;

  function ev(type, name, params, opts) {
    try {
      if (window.fbq) {
        if (opts) fbq(type, name, params || {}, opts);
        else fbq(type, name, params || {});
      }
    } catch (e) {}
  }

  function cookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function eid() {
    return "ev_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
  }

  function beacon(name, eventID) {
    try {
      var url =
        "https://www.facebook.com/tr?id=" +
        PIXEL_ID +
        "&ev=" +
        encodeURIComponent(name) +
        "&dl=" +
        encodeURIComponent(location.href) +
        "&rl=" +
        encodeURIComponent(document.referrer || "") +
        "&if=false&ts=" +
        Date.now() +
        "&eid=" +
        encodeURIComponent(eventID) +
        (cookie("_fbp") ? "&fbp=" + encodeURIComponent(cookie("_fbp")) : "") +
        (cookie("_fbc") ? "&fbc=" + encodeURIComponent(cookie("_fbc")) : "") +
        "&noscript=1";
      if (navigator.sendBeacon) navigator.sendBeacon(url);
      else {
        var img = new Image();
        img.src = url;
      }
    } catch (e) {}
  }

  function fireStandard(name, params) {
    var id = eid();
    ev("track", name, params, { eventID: id });
    beacon(name, id);
    if (name === "Schedule") scheduleSent = true;
    return id;
  }

  function closestAnchor(el) {
    if (!el) return null;
    if (el.closest) return el.closest("a");
    while (el && el.nodeType === 1) {
      if (el.tagName === "A") return el;
      el = el.parentNode;
    }
    return null;
  }

  function shouldHold(a, e, hrefAttr) {
    if (!hrefAttr || hrefAttr.charAt(0) === "#") return false;
    if (a.target === "_blank") return false;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
    if (e.which === 2 || e.button === 1) return false;
    var protocol = (a.protocol || "").toLowerCase();
    if (protocol === "tel:" || protocol === "sms:" || protocol === "http:" || protocol === "https:") return true;
    if (hrefAttr.indexOf("tel:") === 0 || hrefAttr.indexOf("sms:") === 0) return true;
    return false;
  }

  function trackAndMaybeHold(e, a, standardName, params, customName, customParams) {
    ev("trackCustom", customName, customParams);
    fireStandard(standardName, params);
    var hrefAttr = a.getAttribute("href") || "";
    if (!shouldHold(a, e, hrefAttr)) return;
    e.preventDefault();
    var dest = a.href;
    setTimeout(function () {
      window.location.href = dest;
    }, 300);
  }

  document.addEventListener(
    "click",
    function (e) {
      var a = closestAnchor(e.target);
      if (!a) return;
      var h = a.getAttribute("href") || "";
      var t = a.getAttribute("data-ev");
      if (h === "#book") {
        trackAndMaybeHold(
          e,
          a,
          "Schedule",
          { content_category: offer, content_name: offer + "_book_cta" },
          "BookClick",
          { offer: offer }
        );
      } else if (t === "bookext" || /portal\.sked\.life|intake\.chirohd\.com/.test(h)) {
        trackAndMaybeHold(
          e,
          a,
          "Schedule",
          { content_category: offer + "_external", content_name: offer + "_book_external" },
          "BookExternal",
          { offer: offer }
        );
      } else if (t === "call" || h.indexOf("tel:") === 0) {
        trackAndMaybeHold(
          e,
          a,
          "Contact",
          { content_name: offer + "_call" },
          "CallClick",
          { offer: offer }
        );
      } else if (t === "text" || h.indexOf("sms:") === 0) {
        trackAndMaybeHold(
          e,
          a,
          "Contact",
          { content_name: offer + "_text" },
          "TextClick",
          { offer: offer }
        );
      }
    },
    true
  );

  var bk = document.getElementById("book");
  var iframe = bk && bk.querySelector("iframe");
  var sb = document.querySelector('.sticky a[href="#book"]');
  var seen = false;
  var embedTracked = false;

  function trackEmbedInteract() {
    if (embedTracked) return;
    if (iframe && document.activeElement !== iframe) return;
    embedTracked = true;
    ev("trackCustom", "SchedulerInteract", { offer: offer });
    // Deeper-funnel Schedule when someone actually uses the embed.
    // Skip a second Schedule if a Book CTA / external-book click already sent one.
    if (!scheduleSent) {
      fireStandard("Schedule", {
        content_category: offer,
        content_name: offer + "_scheduler_interact"
      });
    }
  }

  function checkEmbed() {
    if (iframe && document.activeElement === iframe) trackEmbedInteract();
  }

  if (iframe) {
    window.addEventListener("blur", function () {
      setTimeout(checkEmbed, 0);
    });
    document.addEventListener("visibilitychange", checkEmbed);
  }

  if ("IntersectionObserver" in window && bk) {
    new IntersectionObserver(
      function (es) {
        es.forEach(function (x) {
          if (sb) sb.style.display = x.isIntersecting ? "none" : "";
          if (x.isIntersecting && !seen) {
            seen = true;
            ev("track", "ViewContent", { content_name: offer + "_scheduler" });
          }
        });
      },
      { threshold: 0.05 }
    ).observe(bk);
  }
})();
