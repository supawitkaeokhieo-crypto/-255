/* ===================================================================
   เชียงใหม่.เที่ยว — Shared behaviour
   1) เมนูมือถือแบบ overlay (hamburger -> full-screen panel)
   2) กล่อง overlay ขยายรูป/สื่อ เมื่อคลิกที่ media-slot
   3) แผงข้อมูลแบบ accordion (แทนการเรียงหัวข้อจากบนลงล่างตรง ๆ)
   4) วิดเจ็ตสภาพอากาศจาก Open-Meteo (Web API สาธารณะ ไม่ต้องใช้คีย์)
=================================================================== */
(function(){
  "use strict";

  /* ---------------- 1) Mobile nav overlay ---------------- */
  function initMobileNav(){
    var topnavWrap = document.querySelector(".topnav .wrap");
    if (!topnavWrap) return;

    var burger = document.createElement("button");
    burger.className = "hamburger";
    burger.setAttribute("aria-label", "เปิดเมนู");
    burger.setAttribute("aria-expanded", "false");
    burger.innerHTML = "<span></span><span></span><span></span>";
    topnavWrap.appendChild(burger);

    var navLinks = document.querySelector(".navlinks");
    var overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    overlay.setAttribute("aria-hidden", "true");

    var panel = document.createElement("div");
    panel.className = "nav-overlay-panel";
    var closeBtn = document.createElement("button");
    closeBtn.className = "nav-overlay-close";
    closeBtn.setAttribute("aria-label", "ปิดเมนู");
    closeBtn.innerHTML = "&times;";
    panel.appendChild(closeBtn);

    var list = document.createElement("nav");
    list.className = "nav-overlay-links";
    if (navLinks) list.innerHTML = navLinks.innerHTML;
    panel.appendChild(list);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    function openNav(){
      overlay.classList.add("is-open");
      burger.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      overlay.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    }
    function closeNav(){
      overlay.classList.remove("is-open");
      burger.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      overlay.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    }

    burger.addEventListener("click", function(){
      overlay.classList.contains("is-open") ? closeNav() : openNav();
    });
    closeBtn.addEventListener("click", closeNav);
    overlay.addEventListener("click", function(e){
      if (e.target === overlay) closeNav();
    });
    list.querySelectorAll("a").forEach(function(a){
      a.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function(e){
      if (e.key === "Escape") closeNav();
    });
  }

  /* ---------------- 2) Media lightbox overlay (เฉพาะรูปภาพ) ---------------- */
  function initLightbox(){
    var slots = document.querySelectorAll(".media-slot.image-slot");
    if (!slots.length) return;

    var overlay = document.createElement("div");
    overlay.className = "media-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML =
      '<div class="media-overlay-box">' +
        '<button class="media-overlay-close" aria-label="ปิด">&times;</button>' +
        '<img class="media-overlay-photo" alt="" hidden>' +
        '<div class="media-overlay-icon"></div>' +
        '<p class="media-overlay-caption"></p>' +
        '<small class="media-overlay-hint">ตำแหน่งสำหรับใส่รูปจริงในภายหลัง</small>' +
      '</div>';
    document.body.appendChild(overlay);

    var photoEl = overlay.querySelector(".media-overlay-photo");
    var iconEl = overlay.querySelector(".media-overlay-icon");
    var capEl = overlay.querySelector(".media-overlay-caption");
    var hintEl = overlay.querySelector(".media-overlay-hint");
    var closeBtn = overlay.querySelector(".media-overlay-close");

    function openOverlay(slot){
      var img = slot.querySelector("img");
      var icon = slot.querySelector(".icon");
      var text = slot.textContent.trim().split("\n")[0] || "";
      var caption = slot.getAttribute("data-caption") || (img && img.alt) || text;

      if (img && img.getAttribute("src")){
        photoEl.src = img.getAttribute("src");
        photoEl.alt = caption;
        photoEl.hidden = false;
        iconEl.hidden = true;
        hintEl.hidden = true;
      } else {
        photoEl.hidden = true;
        iconEl.hidden = false;
        iconEl.textContent = icon ? icon.textContent : "🖼️";
        hintEl.hidden = false;
      }
      capEl.textContent = caption;
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      document.documentElement.style.overflow = "hidden";
    }
    function closeOverlay(){
      overlay.classList.remove("is-open");
      overlay.setAttribute("aria-hidden", "true");
      document.documentElement.style.overflow = "";
    }

    slots.forEach(function(slot){
      slot.setAttribute("role", "button");
      slot.setAttribute("tabindex", "0");
      slot.addEventListener("click", function(){ openOverlay(slot); });
      slot.addEventListener("keydown", function(e){
        if (e.key === "Enter" || e.key === " "){ e.preventDefault(); openOverlay(slot); }
      });
    });
    closeBtn.addEventListener("click", closeOverlay);
    overlay.addEventListener("click", function(e){ if (e.target === overlay) closeOverlay(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeOverlay(); });
  }

  /* ---------------- 2b) วางลิงก์ YouTube แล้วฝังวิดีโอทันที ---------------- */
  function extractYouTubeId(url){
    if (!url) return null;
    url = url.trim();
    var m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
    return null;
  }

  function renderYouTubeEmbed(slot, id){
    slot.innerHTML =
      '<div class="yt-embed-frame">' +
        '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '" ' +
        'title="YouTube video" loading="lazy" ' +
        'referrerpolicy="strict-origin-when-cross-origin" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ' +
        'allowfullscreen></iframe>' +
      '</div>';
  }

  function bindVideoSlot(slot){
    /* ใส่ลิงก์ YouTube ไว้ที่ data-youtube="..." ในโค้ด HTML ของช่องนี้ตรง ๆ
       แล้วทุกคนที่เข้าเว็บจะเห็นวิดีโอเดียวกันทันที ถาวร ไม่ต้องพึ่งเบราว์เซอร์ใคร
       ถ้ายังไม่ใส่ลิงก์ ช่องจะแสดงเป็น placeholder ปกติ */
    var presetId = extractYouTubeId(slot.getAttribute("data-youtube"));
    if (presetId) renderYouTubeEmbed(slot, presetId);
  }

  function initYouTubeSlots(){
    document.querySelectorAll(".media-slot.video-slot").forEach(bindVideoSlot);
  }

  /* ---------------- 3) Accordion (จัดข้อมูลใหม่ ไม่เรียงยาวบนลงล่าง) ---------------- */
  function initAccordion(){
    var groups = document.querySelectorAll(".accordion");
    groups.forEach(function(group){
      var items = group.querySelectorAll(".accordion-item");
      items.forEach(function(item, i){
        var btn = item.querySelector(".accordion-trigger");
        var panel = item.querySelector(".accordion-panel");
        if (!btn || !panel) return;
        var open = i === 0; /* เปิดหัวข้อแรกไว้ก่อน */
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        panel.hidden = !open;
        item.classList.toggle("is-open", open);

        btn.addEventListener("click", function(){
          var willOpen = panel.hidden;
          items.forEach(function(other){
            var oBtn = other.querySelector(".accordion-trigger");
            var oPanel = other.querySelector(".accordion-panel");
            if (!oBtn || !oPanel) return;
            oPanel.hidden = true;
            oBtn.setAttribute("aria-expanded", "false");
            other.classList.remove("is-open");
          });
          if (willOpen){
            panel.hidden = false;
            btn.setAttribute("aria-expanded", "true");
            item.classList.add("is-open");
          }
        });
      });
    });
  }

  /* ---------------- 4) วิดเจ็ตสภาพอากาศ (Open-Meteo Web API) ---------------- */
  var WEATHER_CODES = {
    0: ["ท้องฟ้าแจ่มใส", "☀️"], 1: ["แจ่มใสเป็นส่วนใหญ่", "🌤️"],
    2: ["มีเมฆบางส่วน", "⛅"], 3: ["เมฆมาก", "☁️"],
    45: ["หมอก", "🌫️"], 48: ["หมอกน้ำแข็ง", "🌫️"],
    51: ["ฝนละอองเบา", "🌦️"], 53: ["ฝนละออง", "🌦️"], 55: ["ฝนละอองหนาแน่น", "🌧️"],
    61: ["ฝนตกเล็กน้อย", "🌧️"], 63: ["ฝนตกปานกลาง", "🌧️"], 65: ["ฝนตกหนัก", "🌧️"],
    71: ["หิมะตกเล็กน้อย", "🌨️"], 80: ["ฝนซู่ๆ", "🌦️"], 81: ["ฝนซู่ๆ ปานกลาง", "🌧️"],
    82: ["ฝนซู่ๆ หนัก", "⛈️"], 95: ["พายุฝนฟ้าคะนอง", "⛈️"], 96: ["พายุฝนฟ้าคะนองมีลูกเห็บ", "⛈️"]
  };

  function describeWeather(code){
    return WEATHER_CODES[code] || ["ไม่ทราบสภาพอากาศ", "🌡️"];
  }

  function initWeatherWidgets(){
    var widgets = document.querySelectorAll(".weather-widget");
    if (!widgets.length) return;

    widgets.forEach(function(widget){
      var lat = widget.getAttribute("data-lat");
      var lon = widget.getAttribute("data-lon");
      if (!lat || !lon) return;

      var url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
                 "&longitude=" + lon +
                 "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code" +
                 "&timezone=Asia%2FBangkok";

      fetch(url)
        .then(function(res){
          if (!res.ok) throw new Error("network");
          return res.json();
        })
        .then(function(data){
          var cur = data && data.current;
          if (!cur) throw new Error("no data");
          var w = describeWeather(cur.weather_code);
          widget.innerHTML =
            '<div class="weather-top">' +
              '<span class="weather-icon">' + w[1] + '</span>' +
              '<span class="weather-temp">' + Math.round(cur.temperature_2m) + '°C</span>' +
            '</div>' +
            '<div class="weather-desc">' + w[0] + '</div>' +
            '<dl class="weather-meta">' +
              '<dt>ความชื้น</dt><dd>' + cur.relative_humidity_2m + '%</dd>' +
              '<dt>ลม</dt><dd>' + Math.round(cur.wind_speed_10m) + ' กม./ชม.</dd>' +
            '</dl>' +
            '<small class="weather-source">ข้อมูลจาก Open-Meteo · อัปเดตแบบเรียลไทม์</small>';
        })
        .catch(function(){
          widget.innerHTML =
            '<div class="weather-desc">ไม่สามารถโหลดข้อมูลสภาพอากาศได้ในขณะนี้</div>' +
            '<small class="weather-source">ลองรีเฟรชหน้าอีกครั้ง</small>';
        });
    });
  }

  document.addEventListener("DOMContentLoaded", function(){
    initMobileNav();
    initLightbox();
    initYouTubeSlots();
    initAccordion();
    initWeatherWidgets();
  });
})();
