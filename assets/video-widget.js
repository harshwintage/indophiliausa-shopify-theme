(function() {
  'use strict';

  // ==================== CONFIG ====================
  var PROXY_URL = 'https://videoapp.wntg.in/api/videos';
  var BUNNY_CDN = 'https://vz-ff818d5d-5dc.b-cdn.net';
  var VIRTUAL_SLIDES = 5;     // DOM slides — recycled, never grows
  var BATCH_SIZE = 30;         // Videos per API fetch
  var SETTLE_DELAY = 350;      // ms to wait after swipe before loading video
  var PREFETCH_THRESHOLD = 5;  // Fetch more when this many videos remain

  var STORE_MAP = {
    'indophilia.store': 'indophiliaglobal',
    'indophilia.in': 'indophiliaglobal',
    'indophiliausa.myshopify.com': 'indophiliaglobal',
    'wintage.in': 'wintageindia',
    'wintage-garments.myshopify.com': 'wintageindia',
    'wintagefashion.com': 'wintageglobal',
    'wintage-usa.myshopify.com': 'wintageglobal',
    'talethread.in': 'talethreadindia',
    'talethreadindia.myshopify.com': 'talethreadindia',
    'talethread.com': 'talethreadglobal',
    'talethread.myshopify.com': 'talethreadglobal'
  };

  // ==================== GUARDS ====================
  var storeId = STORE_MAP[window.location.hostname];
  if (!storeId) return;

  function getProductHandle() {
    var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    if (match && match[1]) return match[1];
    try { if (window.meta && window.meta.product && window.meta.product.handle) return window.meta.product.handle; } catch(e) {}
    try { if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) return window.ShopifyAnalytics.meta.product.handle; } catch(e) {}
    return null;
  }

  function waitForHandle(callback, attempts) {
    attempts = attempts || 0;
    var handle = getProductHandle();
    if (handle) { callback(handle); }
    else if (attempts < 15) { setTimeout(function() { waitForHandle(callback, attempts + 1); }, 300); }
  }

  // Delay init until page is idle
  function onIdle(fn) {
    if (window.requestIdleCallback) { window.requestIdleCallback(fn, { timeout: 2000 }); }
    else { setTimeout(fn, 100); }
  }

  onIdle(function() {
    waitForHandle(function(currentHandle) {

  // ==================== HELPERS ====================
  function xhrGet(url, headers, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if (headers) { for (var key in headers) { if (headers.hasOwnProperty(key)) xhr.setRequestHeader(key, headers[key]); } }
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { callback(JSON.parse(xhr.responseText)); } catch(e) { callback(null); }
        } else { callback(null); }
      }
    };
    xhr.onerror = function() { callback(null); };
    try { xhr.send(); } catch(e) { callback(null); }
  }

  function apiFetch(params, callback) {
    var url = PROXY_URL + '?store=' + storeId + '&handle=' + encodeURIComponent(currentHandle);
    if (params.offset) url += '&offset=' + params.offset;
    if (params.limit) url += '&limit=' + params.limit;

    if (window.fetch) {
      window.fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) { callback(data); })
        .catch(function() { xhrGet(url, null, callback); });
    } else {
      xhrGet(url, null, callback);
    }
  }

  function getThumbnail(video) {
    if (video.thumbnail_url) return video.thumbnail_url;
    var match = video.bunny_url && video.bunny_url.match(/b-cdn\.net\/([^/]+)\//);
    if (match) return BUNNY_CDN + '/' + match[1] + '/thumbnail.jpg';
    return '';
  }

  // Polyfill for Element.closest
  if (!Element.prototype.closest) {
    Element.prototype.closest = function(s) {
      var el = this;
      do { if (el.matches ? el.matches(s) : el.msMatchesSelector(s)) return el; el = el.parentElement || el.parentNode; } while (el !== null && el.nodeType === 1);
      return null;
    };
  }

  // ==================== DATA ====================
  var videos = [];
  var totalServerVideos = 0;
  var hasMore = false;
  var isFetchingMore = false;
  var taggedCount = 0;

  function loadInitialVideos(callback) {
    apiFetch({ offset: 0, limit: BATCH_SIZE }, function(data) {
      if (!data || !data.videos || !data.videos.length) { callback([]); return; }
      videos = data.videos;
      totalServerVideos = data.total || videos.length;
      hasMore = data.hasMore || false;
      taggedCount = data.taggedCount || 0;
      callback(videos);
    });
  }

  function loadMoreVideos(callback) {
    if (!hasMore || isFetchingMore) return;
    isFetchingMore = true;
    apiFetch({ offset: videos.length, limit: BATCH_SIZE }, function(data) {
      isFetchingMore = false;
      if (!data || !data.videos || !data.videos.length) { hasMore = false; return; }
      for (var i = 0; i < data.videos.length; i++) videos.push(data.videos[i]);
      hasMore = data.hasMore || false;
      if (callback) callback();
    });
  }

  // ==================== STYLES ====================
  function injectStyles() {
    var css =
      '#vw-bubble{' +
        'position:fixed;bottom:80px;left:16px;width:60px;height:60px;' +
        'border-radius:50%;overflow:hidden;cursor:pointer;z-index:9999;' +
        'border:2.5px solid #fff;box-shadow:0 4px 15px rgba(0,0,0,0.25);background:#000;' +
      '}' +
      '#vw-bubble img{width:100%;height:100%;object-fit:cover;display:block;}' +
      '#vw-bubble-play{' +
        'position:absolute;top:0;right:0;bottom:0;left:0;display:flex;align-items:center;justify-content:center;' +
        'background:rgba(0,0,0,0.15);' +
      '}' +
      '#vw-bubble-play svg{width:18px;height:18px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));}' +
      '@keyframes vw-pulse{' +
        '0%{box-shadow:0 4px 15px rgba(0,0,0,0.25),0 0 0 0 rgba(0,0,0,0.2);}' +
        '70%{box-shadow:0 4px 15px rgba(0,0,0,0.25),0 0 0 10px rgba(0,0,0,0);}' +
        '100%{box-shadow:0 4px 15px rgba(0,0,0,0.25),0 0 0 0 rgba(0,0,0,0);}' +
      '}' +
      '#vw-bubble{animation:vw-pulse 2s ease-out 3;}' +

      '#vw-overlay{' +
        'display:none;position:fixed;top:0;right:0;bottom:0;left:0;background:#000;z-index:10000;overflow:hidden;' +
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
      '}' +
      '#vw-overlay.active{display:-webkit-box;display:-webkit-flex;display:flex;-webkit-align-items:center;align-items:center;-webkit-justify-content:center;justify-content:center;}' +

      '#vw-container{' +
        'position:relative;width:100%;height:100%;max-width:420px;overflow:hidden;' +
      '}' +
      '@media(min-width:600px){' +
        '#vw-container{max-height:calc(100vh - 40px);border-radius:16px;box-shadow:0 0 60px rgba(0,0,0,0.5);}' +
      '}' +

      '.vw-slide{' +
        'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden;' +
        'background-size:cover;background-position:center;background-color:#000;' +
        'will-change:transform;' +
      '}' +
      '.vw-slide video{width:100%;height:100%;object-fit:cover;display:block;background:transparent;}' +

      '.vw-grad-top{' +
        'position:absolute;top:0;left:0;right:0;height:120px;' +
        'background:linear-gradient(to bottom,rgba(0,0,0,0.5),transparent);z-index:2;pointer-events:none;' +
      '}' +
      '.vw-grad-bot{' +
        'position:absolute;bottom:0;left:0;right:0;height:140px;' +
        'background:linear-gradient(to top,rgba(0,0,0,0.6),transparent);z-index:2;pointer-events:none;' +
      '}' +

      '#vw-progress-wrap{' +
        'position:absolute;top:0;left:0;right:0;height:3px;z-index:10002;background:rgba(255,255,255,0.2);' +
      '}' +
      '#vw-progress-bar{height:100%;background:#fff;width:0%;}' +

      '.vw-ctrl{' +
        'position:absolute;z-index:10001;color:#fff;cursor:pointer;' +
        'background:rgba(0,0,0,0.3);border:none;width:40px;height:40px;border-radius:50%;' +
        'display:flex;align-items:center;justify-content:center;' +
        '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);padding:0;' +
      '}' +
      '.vw-ctrl svg{width:18px;height:18px;}' +
      '#vw-close{top:14px;left:16px;}' +
      '#vw-share{top:14px;left:66px;}' +
      '#vw-mute{top:14px;right:16px;}' +
      '#vw-pause{top:14px;right:66px;}' +

      '#vw-nav{' +
        'position:absolute;right:12px;top:50%;-webkit-transform:translateY(-50%);transform:translateY(-50%);' +
        'display:flex;flex-direction:column;gap:12px;z-index:10001;' +
      '}' +
      '.vw-nav-btn{' +
        'background:rgba(255,255,255,0.15);border:none;color:#fff;' +
        'width:44px;height:44px;border-radius:50%;cursor:pointer;' +
        'display:flex;align-items:center;justify-content:center;padding:0;' +
        '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);' +
      '}' +
      '.vw-nav-btn svg{width:22px;height:22px;}' +

      '#vw-product-bar{' +
        'position:absolute;bottom:0;left:0;right:0;z-index:10001;' +
        'padding:0 12px 16px 12px;pointer-events:none;' +
        'display:flex;justify-content:center;' +
      '}' +
      '#vw-product-scroll{' +
        'display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;' +
        '-webkit-overflow-scrolling:touch;pointer-events:auto;' +
        'max-width:100%;' +
      '}' +
      '#vw-product-scroll:empty{pointer-events:none;}' +
      '#vw-product-scroll::-webkit-scrollbar{display:none;}' +
      '.vw-product-card{' +
        'flex:0 0 auto;width:140px;' +
        'background:rgba(0,0,0,0.7);border-radius:10px;' +
        'padding:10px 12px;' +
        '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
      '}' +
      '.vw-pc-title{color:#fff;font-size:12px;font-weight:600;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.vw-pc-btn{' +
        'display:block;margin-top:8px;padding:6px 0;' +
        'background:#fff;color:#000;border-radius:5px;font-size:11px;font-weight:600;' +
        'text-decoration:none;text-align:center;cursor:pointer;' +
      '}' +

      '#vw-pause-indicator{' +
        'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
        'z-index:10001;pointer-events:none;opacity:0;transition:opacity 0.15s;' +
      '}' +
      '#vw-pause-indicator.visible{opacity:1;}' +
      '#vw-pause-indicator svg{width:64px;height:64px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.4));}' +

      '#vw-toast{' +
        'position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:10002;' +
        'background:rgba(255,255,255,0.9);color:#000;padding:8px 20px;border-radius:20px;' +
        'font-size:13px;font-weight:500;opacity:0;transition:opacity 0.3s;pointer-events:none;' +
      '}' +
      '#vw-toast.show{opacity:1;}' +

      '.vw-loading{' +
        'position:absolute;top:0;right:0;bottom:0;left:0;' +
        'display:flex;align-items:center;justify-content:center;' +
        'z-index:1;pointer-events:none;' +
      '}' +
      '@keyframes vw-spin{to{transform:rotate(360deg);}}' +
      '.vw-spinner{' +
        'width:28px;height:28px;border:2.5px solid rgba(255,255,255,0.2);' +
        'border-top-color:#fff;border-radius:50%;animation:vw-spin 0.7s linear infinite;' +
      '}';

    var el = document.createElement('style');
    el.type = 'text/css';
    if (el.styleSheet) { el.styleSheet.cssText = css; }
    else { el.appendChild(document.createTextNode(css)); }
    document.getElementsByTagName('head')[0].appendChild(el);
  }

  // ==================== ICONS ====================
  var ICONS = {
    play: '<svg viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>',
    muted: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>',
    unmuted: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>',
    pauseIcon: '<svg viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    playIcon: '<svg viewBox="0 0 24 24" fill="white"><polygon points="6,3 20,12 6,21"/></svg>',
    pauseBig: '<svg viewBox="0 0 24 24" fill="white" opacity="0.9"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
    chevUp: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>',
    chevDown: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'
  };

  // ==================== BUILD WIDGET ====================
  function buildWidget(vids) {
    if (!vids || !vids.length) return;
    injectStyles();

    var currentIndex = 0;
    var isMuted = true;
    var isPaused = false;
    var isOpen = false;
    var totalVideos = vids.length;

    // Virtual slide pool — fixed size, recycled
    var slideEls = [];
    var videoEls = [];
    var loaderEls = [];
    var slideAssignments = []; // which video index each slide is showing

    var settleTimer = null;
    var isFastSwiping = false;

    // Restore mute preference
    try { if (sessionStorage.getItem('vw-muted') === '0') isMuted = false; } catch(e) {}

    // -------- BUBBLE --------
    var bubble = document.createElement('div');
    bubble.id = 'vw-bubble';
    bubble.setAttribute('aria-label', 'Watch product videos');
    var thumbSrc = getThumbnail(videos[0]);
    bubble.innerHTML =
      '<img src="' + thumbSrc + '" alt="" onerror="this.style.display=\'none\'" />' +
      '<div id="vw-bubble-play">' + ICONS.play + '</div>';
    document.body.appendChild(bubble);

    // -------- OVERLAY --------
    var overlay = document.createElement('div');
    overlay.id = 'vw-overlay';

    var container = document.createElement('div');
    container.id = 'vw-container';

    var progressWrap = document.createElement('div');
    progressWrap.id = 'vw-progress-wrap';
    var progressBar = document.createElement('div');
    progressBar.id = 'vw-progress-bar';
    progressWrap.appendChild(progressBar);
    container.appendChild(progressWrap);

    // -------- VIRTUAL SLIDES (fixed pool of 5) --------
    var numSlides = Math.min(VIRTUAL_SLIDES, totalVideos);
    for (var i = 0; i < numSlides; i++) {
      var slide = document.createElement('div');
      slide.className = 'vw-slide';

      var video = document.createElement('video');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('loop', '');
      video.setAttribute('preload', 'none');
      video.muted = true;
      video.playsInline = true;

      var gradTop = document.createElement('div');
      gradTop.className = 'vw-grad-top';
      var gradBot = document.createElement('div');
      gradBot.className = 'vw-grad-bot';

      var loader = document.createElement('div');
      loader.className = 'vw-loading';
      loader.innerHTML = '<div class="vw-spinner"></div>';

      slide.appendChild(video);
      slide.appendChild(gradTop);
      slide.appendChild(gradBot);
      slide.appendChild(loader);
      container.appendChild(slide);

      slideEls.push(slide);
      videoEls.push(video);
      loaderEls.push(loader);
      slideAssignments.push(-1);

      (function(v, l) {
        v.addEventListener('canplay', function() { l.style.display = 'none'; });
        v.addEventListener('waiting', function() { l.style.display = 'flex'; });
        v.addEventListener('playing', function() { l.style.display = 'none'; });
        v.addEventListener('error', function() { l.style.display = 'none'; });
      })(video, loader);
    }

    // Controls
    var closeBtn = document.createElement('button');
    closeBtn.id = 'vw-close'; closeBtn.className = 'vw-ctrl';
    closeBtn.setAttribute('aria-label', 'Close'); closeBtn.innerHTML = ICONS.close;
    container.appendChild(closeBtn);

    var shareBtn = document.createElement('button');
    shareBtn.id = 'vw-share'; shareBtn.className = 'vw-ctrl';
    shareBtn.setAttribute('aria-label', 'Share'); shareBtn.innerHTML = ICONS.share;
    container.appendChild(shareBtn);

    var muteBtn = document.createElement('button');
    muteBtn.id = 'vw-mute'; muteBtn.className = 'vw-ctrl';
    muteBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    muteBtn.innerHTML = isMuted ? ICONS.muted : ICONS.unmuted;
    container.appendChild(muteBtn);

    var pauseBtnEl = document.createElement('button');
    pauseBtnEl.id = 'vw-pause'; pauseBtnEl.className = 'vw-ctrl';
    pauseBtnEl.setAttribute('aria-label', 'Pause'); pauseBtnEl.innerHTML = ICONS.pauseIcon;
    container.appendChild(pauseBtnEl);

    // Nav arrows
    var prevBtn, nextBtn;
    if (totalVideos > 1) {
      var nav = document.createElement('div');
      nav.id = 'vw-nav';
      prevBtn = document.createElement('button');
      prevBtn.className = 'vw-nav-btn'; prevBtn.setAttribute('aria-label', 'Previous video');
      prevBtn.innerHTML = ICONS.chevUp;
      nextBtn = document.createElement('button');
      nextBtn.className = 'vw-nav-btn'; nextBtn.setAttribute('aria-label', 'Next video');
      nextBtn.innerHTML = ICONS.chevDown;
      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
      container.appendChild(nav);
    }

    // Product bar
    var productBar = document.createElement('div');
    productBar.id = 'vw-product-bar';
    var productScroll = document.createElement('div');
    productScroll.id = 'vw-product-scroll';
    productBar.appendChild(productScroll);
    container.appendChild(productBar);

    // Pause indicator
    var pauseIndicator = document.createElement('div');
    pauseIndicator.id = 'vw-pause-indicator';
    pauseIndicator.innerHTML = ICONS.pauseBig;
    container.appendChild(pauseIndicator);

    // Toast
    var toast = document.createElement('div');
    toast.id = 'vw-toast'; toast.textContent = 'Link copied!';
    container.appendChild(toast);

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // -------- VIRTUAL SLIDE MANAGEMENT --------
    // Maps a video index to a slide slot (0 to numSlides-1)
    function getSlotForIndex(vidIndex) {
      // Simple modulo mapping — consistent slot for each index
      var slot = ((vidIndex % numSlides) + numSlides) % numSlides;
      return slot;
    }

    function assignSlide(vidIndex) {
      if (vidIndex < 0 || vidIndex >= videos.length) return -1;
      var slot = getSlotForIndex(vidIndex);
      var slide = slideEls[slot];
      var vid = videoEls[slot];
      var loader = loaderEls[slot];
      var videoData = videos[vidIndex];

      // Already assigned to this video — skip
      if (slideAssignments[slot] === vidIndex) return slot;

      // Unload previous video in this slot
      if (vid.src) {
        vid.pause();
        vid.removeAttribute('src');
        try { vid.load(); } catch(e) {}
      }

      slideAssignments[slot] = vidIndex;

      // Set poster/background
      var poster = getThumbnail(videoData);
      if (poster) {
        slide.style.backgroundImage = 'url(' + poster + ')';
        vid.setAttribute('poster', poster);
      } else {
        slide.style.backgroundImage = '';
        vid.removeAttribute('poster');
      }

      // Reset loader
      loader.style.display = 'flex';

      return slot;
    }

    function loadVideoSource(vidIndex) {
      if (vidIndex < 0 || vidIndex >= videos.length) return;
      var slot = getSlotForIndex(vidIndex);
      if (slideAssignments[slot] !== vidIndex) assignSlide(vidIndex);

      var vid = videoEls[slot];
      var videoData = videos[vidIndex];

      if (vid.getAttribute('data-src-set') !== videoData.bunny_url) {
        vid.src = videoData.bunny_url;
        vid.setAttribute('data-src-set', videoData.bunny_url);
        vid.preload = 'auto';
        try { vid.load(); } catch(e) {}
      }
    }

    function positionSlides() {
      // Position only the slides we need: current and 2 on each side
      var half = Math.floor(numSlides / 2);
      for (var offset = -half; offset <= half; offset++) {
        var vidIndex = currentIndex + offset;
        if (vidIndex < 0 || vidIndex >= videos.length) {
          // Handle wrapping
          if (videos.length > numSlides) {
            vidIndex = ((vidIndex % videos.length) + videos.length) % videos.length;
          } else {
            continue;
          }
        }
        var slot = assignSlide(vidIndex);
        if (slot === -1) continue;
        // Position relative to current
        slideEls[slot].style.transform = 'translateY(' + (offset * 100) + '%)';
        slideEls[slot].style.transition = 'none';
      }
    }

    // -------- VIDEO PLAYBACK --------
    function playCurrentVideo() {
      var slot = getSlotForIndex(currentIndex);
      if (slideAssignments[slot] !== currentIndex) return;

      var v = videoEls[slot];
      v.muted = isMuted;
      try { v.currentTime = 0; } catch(e) {}
      isPaused = false;
      pauseBtnEl.innerHTML = ICONS.pauseIcon;
      pauseIndicator.className = pauseIndicator.className.replace(' visible', '');

      try {
        var p = v.play();
        if (p && p.catch) {
          p.catch(function() {
            // Play failed (browser autoplay policy) — retry muted
            // but do NOT change isMuted, so next video tries unmuted again
            v.muted = true;
            muteBtn.innerHTML = ICONS.muted;
            try {
              v.play();
              // Retry unmuted after buffer builds up
              setTimeout(function() {
                if (!isMuted && !isPaused) {
                  v.muted = false;
                  muteBtn.innerHTML = ICONS.unmuted;
                }
              }, 800);
            } catch(e) {}
          });
        }
      } catch(e) {}

      // Pause all other slots
      for (var i = 0; i < videoEls.length; i++) {
        if (i !== slot) try { videoEls[i].pause(); } catch(e) {}
      }
    }

    function onSettle() {
      // Called after swipe settles — load video and play
      loadVideoSource(currentIndex);

      // Preload adjacent
      if (currentIndex > 0) loadVideoSource(currentIndex - 1);
      if (currentIndex < videos.length - 1) loadVideoSource(currentIndex + 1);

      playCurrentVideo();
      updateProductCard();
      isFastSwiping = false;

      // Check if we need to fetch more videos
      var remaining = videos.length - currentIndex;
      if (remaining <= PREFETCH_THRESHOLD && hasMore) {
        loadMoreVideos(function() {
          totalVideos = videos.length;
        });
      }
    }

    function scheduleSettle() {
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(onSettle, SETTLE_DELAY);
    }

    // -------- PRODUCT CARD (from API data, no Shopify calls) --------
    function updateProductCard() {
      var vid = videos[currentIndex];
      var prods = vid.video_products || [];
      productScroll.innerHTML = '';

      // Filter: skip current product (already viewing it) and out-of-stock
      var visibleProds = [];
      for (var i = 0; i < prods.length; i++) {
        if (prods[i].product_handle === currentHandle) continue;
        if (prods[i].product_available === false) continue;
        visibleProds.push(prods[i]);
      }

      // CRITICAL: Hide entire bar when no cards — prevents invisible click-blocking layer
      if (!visibleProds.length) {
        productBar.style.display = 'none';
        return;
      }
      productBar.style.display = '';

      for (var i = 0; i < visibleProds.length; i++) {
        var p = visibleProds[i];

        var card = document.createElement('div');
        card.className = 'vw-product-card';

        var html = '<div class="vw-pc-title">' + (p.product_title || p.product_handle).replace(/</g, '&lt;') + '</div>';
        html += '<a class="vw-pc-btn" href="/products/' + p.product_handle + '" target="_blank" rel="noopener">View</a>';
        card.innerHTML = html;

        // Pause video when navigating to product
        var link = card.querySelector('.vw-pc-btn');
        if (link) {
          link.addEventListener('click', function() {
            var slot = getSlotForIndex(currentIndex);
            try { videoEls[slot].pause(); } catch(e) {}
          });
        }

        productScroll.appendChild(card);
      }
    }

    // -------- PROGRESS BAR --------
    var rafId = null;
    function startProgress() {
      if (rafId) cancelAnimationFrame(rafId);
      (function tick() {
        var slot = getSlotForIndex(currentIndex);
        var v = videoEls[slot];
        if (v && v.duration && isFinite(v.duration)) {
          progressBar.style.width = (v.currentTime / v.duration * 100) + '%';
        }
        rafId = requestAnimationFrame(tick);
      })();
    }
    function stopProgress() { if (rafId) cancelAnimationFrame(rafId); }

    // -------- NAVIGATION --------
    function goTo(index, animated) {
      var oldIndex = currentIndex;
      if (index < 0) index = videos.length - 1;
      if (index >= videos.length) index = 0;
      currentIndex = index;
      totalVideos = videos.length;

      // Assign slides for new position
      positionSlides();

      if (animated !== false) {
        // Animate current and adjacent slides
        var direction = index > oldIndex ? -1 : 1;
        // Handle wrap-around
        if (oldIndex === 0 && index === videos.length - 1) direction = 1;
        if (oldIndex === videos.length - 1 && index === 0) direction = -1;

        var currentSlot = getSlotForIndex(currentIndex);
        var oldSlot = getSlotForIndex(oldIndex);

        // Position new slide at entry point (no transition)
        slideEls[currentSlot].style.transition = 'none';
        slideEls[currentSlot].style.transform = 'translateY(' + (-direction * 100) + '%)';

        // Force reflow
        slideEls[currentSlot].offsetHeight;

        // Animate both slides
        var transitionCSS = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
        slideEls[currentSlot].style.transition = transitionCSS;
        slideEls[currentSlot].style.transform = 'translateY(0%)';

        if (oldSlot !== currentSlot) {
          slideEls[oldSlot].style.transition = transitionCSS;
          slideEls[oldSlot].style.transform = 'translateY(' + (direction * 100) + '%)';
        }
      }

      // During fast swipes, only show poster — defer video load
      isFastSwiping = true;

      // Pause old video immediately
      var oldSlotPause = getSlotForIndex(oldIndex);
      try { videoEls[oldSlotPause].pause(); } catch(e) {}

      scheduleSettle();
    }

    // -------- OPEN / CLOSE --------
    function open() {
      isOpen = true;
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
      currentIndex = 0;
      positionSlides();
      loadVideoSource(currentIndex);
      if (videos.length > 1) loadVideoSource(1);
      playCurrentVideo();
      updateProductCard();
      startProgress();
    }

    function close() {
      isOpen = false;
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      stopProgress();
      for (var i = 0; i < videoEls.length; i++) {
        try { videoEls[i].pause(); } catch(e) {}
      }
    }

    bubble.addEventListener('click', open);
    closeBtn.addEventListener('click', function(e) { e.stopPropagation(); close(); });
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });

    // -------- MUTE --------
    function toggleMute() {
      isMuted = !isMuted;
      for (var i = 0; i < videoEls.length; i++) videoEls[i].muted = isMuted;
      muteBtn.innerHTML = isMuted ? ICONS.muted : ICONS.unmuted;
      muteBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
      try { sessionStorage.setItem('vw-muted', isMuted ? '1' : '0'); } catch(e) {}
    }
    muteBtn.addEventListener('click', function(e) { e.stopPropagation(); toggleMute(); });

    // -------- PAUSE --------
    function togglePause() {
      var slot = getSlotForIndex(currentIndex);
      var v = videoEls[slot];
      if (!v) return;
      if (isPaused) {
        try { v.play(); } catch(e) {}
        isPaused = false;
        pauseBtnEl.innerHTML = ICONS.pauseIcon;
        pauseIndicator.classList.remove('visible');
      } else {
        try { v.pause(); } catch(e) {}
        isPaused = true;
        pauseBtnEl.innerHTML = ICONS.playIcon;
        pauseIndicator.classList.add('visible');
      }
    }
    pauseBtnEl.addEventListener('click', function(e) { e.stopPropagation(); togglePause(); });

    // -------- NAV ARROWS --------
    if (totalVideos > 1) {
      prevBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(currentIndex - 1); });
      nextBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(currentIndex + 1); });
    }

    // -------- SHARE --------
    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(function() { toast.classList.remove('show'); }, 1500);
    }
    shareBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      var vid = videos[currentIndex];
      var prods = vid.video_products || [];
      // Always share first product of current video
      var url = prods.length
        ? (window.location.origin + '/products/' + prods[0].product_handle)
        : window.location.href;
      if (navigator.share) {
        navigator.share({ title: prods.length ? prods[0].product_title : document.title, url: url }).catch(function() {});
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() { showToast('Link copied!'); }).catch(function() {});
      }
    });

    // -------- TOUCH / SWIPE --------
    var touchStartY = 0;
    var touchStartTime = 0;
    var touchDelta = 0;
    var isSwiping = false;

    function isControl(el) {
      while (el && el !== container) {
        if (el.id === 'vw-product-bar' || el.id === 'vw-nav') return true;
        var cn = el.className || '';
        if (typeof cn === 'string' && (cn.indexOf('vw-ctrl') !== -1 || cn.indexOf('vw-nav-btn') !== -1 || cn.indexOf('vw-pc-btn') !== -1)) return true;
        el = el.parentNode;
      }
      return false;
    }

    container.addEventListener('touchstart', function(e) {
      if (isControl(e.target)) return;
      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      touchDelta = 0;
      isSwiping = true;
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
      if (!isSwiping) return;
      touchDelta = e.touches[0].clientY - touchStartY;

      // Finger-follow on current and adjacent slide
      var currentSlot = getSlotForIndex(currentIndex);
      var delta = touchDelta;

      // Edge resistance at top
      if (currentIndex === 0 && delta > 0) delta = delta * 0.3;

      slideEls[currentSlot].style.transition = 'none';
      slideEls[currentSlot].style.transform = 'translateY(' + delta + 'px)';

      // Show adjacent slide following finger
      if (delta < 0 && currentIndex < videos.length - 1) {
        var nextSlot = getSlotForIndex(currentIndex + 1);
        assignSlide(currentIndex + 1);
        slideEls[nextSlot].style.transition = 'none';
        slideEls[nextSlot].style.transform = 'translateY(' + (window.innerHeight + delta) + 'px)';
      } else if (delta > 0 && currentIndex > 0) {
        var prevSlot = getSlotForIndex(currentIndex - 1);
        assignSlide(currentIndex - 1);
        slideEls[prevSlot].style.transition = 'none';
        slideEls[prevSlot].style.transform = 'translateY(' + (-window.innerHeight + delta) + 'px)';
      }
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      if (!isSwiping) return;
      isSwiping = false;
      var elapsed = Date.now() - touchStartTime;
      var velocity = Math.abs(touchDelta) / Math.max(elapsed, 1);

      // Close on pull-down from first video
      if (currentIndex === 0 && touchDelta > 80) {
        close();
        return;
      }

      var newIndex = currentIndex;
      if (touchDelta < -50 || (touchDelta < -20 && velocity > 0.3)) {
        if (currentIndex < videos.length - 1) newIndex = currentIndex + 1;
        else newIndex = 0; // wrap
      } else if (touchDelta > 50 || (touchDelta > 20 && velocity > 0.3)) {
        if (currentIndex > 0) newIndex = currentIndex - 1;
      }

      if (newIndex === currentIndex) {
        // Snap back
        var currentSlot = getSlotForIndex(currentIndex);
        slideEls[currentSlot].style.transition = 'transform 0.3s ease';
        slideEls[currentSlot].style.transform = 'translateY(0)';
        return;
      }

      goTo(newIndex);
    }, { passive: true });

    // -------- LONG PRESS = PAUSE --------
    var longPressTimer = null;
    var isLongPress = false;

    container.addEventListener('touchstart', function(e) {
      if (isControl(e.target)) return;
      isLongPress = false;
      longPressTimer = setTimeout(function() {
        isLongPress = true;
        var slot = getSlotForIndex(currentIndex);
        var v = videoEls[slot];
        if (v && !isPaused) {
          try { v.pause(); } catch(ex) {}
          pauseIndicator.classList.add('visible');
        }
      }, 300);
    }, { passive: true });

    container.addEventListener('touchmove', function() {
      if (Math.abs(touchDelta) > 10) {
        clearTimeout(longPressTimer);
        if (isLongPress) {
          isLongPress = false;
          var slot = getSlotForIndex(currentIndex);
          var v = videoEls[slot];
          if (v && !isPaused) { try { v.play(); } catch(ex) {} pauseIndicator.classList.remove('visible'); }
        }
      }
    }, { passive: true });

    container.addEventListener('touchend', function() {
      clearTimeout(longPressTimer);
      if (isLongPress) {
        isLongPress = false;
        var slot = getSlotForIndex(currentIndex);
        var v = videoEls[slot];
        if (v && !isPaused) { try { v.play(); } catch(ex) {} pauseIndicator.classList.remove('visible'); }
      }
    }, { passive: true });

    // -------- TAP = MUTE/UNMUTE --------
    var tapStartTime = 0;
    container.addEventListener('touchstart', function(e) {
      if (isControl(e.target)) return;
      tapStartTime = Date.now();
    }, { passive: true });

    container.addEventListener('touchend', function(e) {
      if (isControl(e.target)) return;
      var elapsed = Date.now() - tapStartTime;
      if (elapsed < 200 && Math.abs(touchDelta) < 10 && !isLongPress) {
        toggleMute();
      }
    }, { passive: true });

    // -------- MOUSE WHEEL (DESKTOP) --------
    var wheelLock = false;
    overlay.addEventListener('wheel', function(e) {
      if (!isOpen || wheelLock) return;
      if (e.preventDefault) e.preventDefault();
      wheelLock = true;
      if (e.deltaY > 30) goTo(currentIndex + 1);
      else if (e.deltaY < -30) goTo(currentIndex - 1);
      setTimeout(function() { wheelLock = false; }, 500);
    }, false);

    // -------- KEYBOARD --------
    document.addEventListener('keydown', function(e) {
      if (!isOpen) return;
      if (e.key === 'Escape' || e.keyCode === 27) close();
      else if (e.key === 'ArrowDown' || e.keyCode === 40 || e.key === 'ArrowRight' || e.keyCode === 39) { e.preventDefault(); goTo(currentIndex + 1); }
      else if (e.key === 'ArrowUp' || e.keyCode === 38 || e.key === 'ArrowLeft' || e.keyCode === 37) { e.preventDefault(); goTo(currentIndex - 1); }
      else if (e.key === 'm' || e.key === 'M' || e.keyCode === 77) toggleMute();
      else if (e.key === ' ' || e.keyCode === 32) { e.preventDefault(); togglePause(); }
    });
  }

  // ==================== INIT ====================
  loadInitialVideos(buildWidget);

  }); // end waitForHandle
  }); // end onIdle
})();