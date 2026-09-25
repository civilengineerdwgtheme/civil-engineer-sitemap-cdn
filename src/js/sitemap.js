
/* =========================================================
   SITEMAP â€” CivilEngineerDWG Theme
   - JSONP callback unik per-request (tidak saling menghapus)
   - State terpisah: posts / pages / categories
   - Auto top-up paging: target N artikel selalu terpenuhi
   ========================================================= */
(function () {
  'use strict';

  /* ---------- KONFIGURASI ---------- */
  var HOME_PAGE      = 'https://www.titoreista.com'; // tanpa slash di akhir
  var POSTS_PER_BATCH = 80;   // jumlah artikel per klik / load awal
  var PAGES_PER_BATCH = 25;   // jumlah halaman statis per load
  var ORDER           = 'published';
  var SHOW_SNIPPET    = false; // false = kartu seragam (thumbnail + judul + tanggal).
                               // true  = tampilkan ringkasan, TAPI artikel yang isinya
                               //         diawali blok <style> tidak punya ringkasan di
                               //         feed Blogger, jadi kartunya akan tampak kosong.
  var REQ_TIMEOUT     = 20000;
  var MAX_REQ_PER_BATCH = 1000; // pengaman terakhir; pemuatan tetap berlanjut otomatis

  /* ---------- ELEMEN ---------- */
  var app = document.getElementById('app-container');
  if (!app) return;

  var elFeed    = document.getElementById('feed-container');
  var elFeedNav = document.getElementById('feed-nav');
  var elDesc    = document.getElementById('result-desc');
  var elPages   = document.getElementById('page-container');
  var elPageNav = document.getElementById('page-nav');
  var elPageDsc = document.getElementById('page-desc');
  var elSelect  = document.getElementById('label-sorter');
  var elInput   = document.getElementById('feed-q');
  var elForm    = document.getElementById('post-searcher');
  var elBtn     = document.getElementById('action-btn');

  /* ---------- ASET ---------- */
  var ICO_CAL    = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2Zm12 8v9H5v-9Z"/></svg>';
  var ICO_SEARCH = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.44 11.44a1 1 0 0 1 1.42 0l3.85 3.85a1 1 0 0 1-1.42 1.42l-3.85-3.85a1 1 0 0 1 0-1.42"/><path d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11M13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0"/></svg>';
  var ICO_RESET  = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3a5 5 0 1 0 4.55 2.91.5.5 0 0 1 .9-.42A6 6 0 1 1 8 2z"/><path d="M8 4.47V.53a.25.25 0 0 1 .41-.19l2.36 1.97c.12.1.12.28 0 .38L8.41 4.66A.25.25 0 0 1 8 4.47"/></svg>';

  /* ---------- UTIL ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(d);
    } catch (e) { return d.toDateString(); }
  }

  function altLink(entry) {
    var links = entry && entry.link ? entry.link : [];
    for (var i = 0; i < links.length; i++) {
      if (links[i].rel === 'alternate' && /^https?:\/\//i.test(links[i].href || '')) {
        return links[i].href;
      }
    }
    return '';
  }

  function thumbOf(entry) {
    var t = entry && entry.media$thumbnail ? entry.media$thumbnail.url : '';
    if (!t) return '';
    return t.replace(/\/s\d+(-c)?\//, '/w208-h144-c/');
  }

  // Ciri teks yang sebenarnya sisa CSS/kode, bukan kalimat.
  function looksLikeCode(s) {
    if (/[{}]/.test(s)) return true;
    if (/::|:\s*(?:root|hover|focus|before|after|nth-)/i.test(s)) return true;
    if (/--[a-z][a-z0-9-]*\s*:/i.test(s)) return true;               // custom property
    if (/\b\d+(?:px|rem|em|vh|vw|%)\b/i.test(s)) return true;         // satuan CSS
    if (/#[0-9a-f]{3,8}\b/i.test(s)) return true;                    // hex color
    if (/[;]/.test(s) && /:/.test(s)) return true;                   // deklarasi "prop:value;"
    if (/^[.#@][a-z0-9_-]/i.test(s.trim())) return true;             // diawali selektor
    return false;
  }

  function snippetOf(entry) {
    var raw = (entry.summary || entry.content || { $t: '' }).$t || '';

    // 1. Buang komentar, blok <style>/<script>/<noscript> BESERTA ISINYA.
    //    Pola "(?:</style>|$)" penting: feed summary sering memotong artikel
    //    di tengah blok CSS sehingga tag penutupnya tidak ikut terkirim.
    raw = raw
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<style[\s\S]*?(?:<\/style>|$)/gi, ' ')
      .replace(/<script[\s\S]*?(?:<\/script>|$)/gi, ' ')
      .replace(/<noscript[\s\S]*?(?:<\/noscript>|$)/gi, ' ');

    // 2. Buang sisa tag HTML.
    raw = raw.replace(/<[^>]*>/g, ' ');

    // 3. Decode entitas (&amp; &#8230; dll).
    var dec = document.createElement('textarea');
    dec.innerHTML = raw;
    raw = dec.value || raw;

    // 4. Sapu residu CSS: hapus blok aturan utuh "selector{...}".
    var guard = 0;
    while (/\{[^{}]*\}/.test(raw) && guard++ < 60) {
      raw = raw.replace(/[^{}]*\{[^{}]*\}/, ' ');
    }
    // 5. Aturan terpenggal (ada "{" tanpa "}") -> potong sampai selektornya.
    var brace = raw.indexOf('{');
    if (brace > -1) raw = raw.substring(0, brace).replace(/\S*$/, '');

    raw = raw.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

    // 6. Tolak sisa yang masih berbau kode / terlalu pendek / kurang dari 4 kata.
    if (raw.length < 25) return '';
    if (looksLikeCode(raw)) return '';
    if (raw.split(/\s+/).filter(function (w) { return w.length > 2; }).length < 4) return '';

    return raw.length > 160 ? raw.substring(0, 160).replace(/\s+\S*$/, '') + '\u2026' : raw;
  }

  /* ---------- JSONP ---------- */
  var cbSeq = 0;
  function jsonp(url, done) {
    var name = '__smCb' + (++cbSeq) + '_' + Date.now();
    var src  = url + (url.indexOf('?') > -1 ? '&' : '?') + 'alt=json-in-script&callback=' + name;
    var s    = document.createElement('script');
    var settled = false;
    var timer;

    function cleanup() {
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      if (s.parentNode) s.parentNode.removeChild(s);
    }

    window[name] = function (json) {
      if (settled) return;
      settled = true;
      cleanup();
      done(null, json || {});
    };

    s.onerror = function () {
      if (settled) return;
      settled = true;
      cleanup();
      done(new Error('network'));
    };

    timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      cleanup();
      done(new Error('timeout'));
    }, REQ_TIMEOUT);

    s.src = src;
    s.async = true;
    (document.head || document.documentElement).appendChild(s);
  }

  /* =========================================================
     ARTICLES
     ========================================================= */
  var st = {
    mode: 'all',      // all | label | search
    label: '',
    query: '',
    next: 1,          // start-index berikutnya
    loaded: 0,
    total: 0,
    busy: false,
    done: false
  };

  function postsUrl(start, max) {
    var base = HOME_PAGE + '/feeds/posts/summary';
    if (st.mode === 'label' && st.label) base += '/-/' + st.label;
    var p = [];
    if (st.mode === 'search' && st.query) p.push('q=' + encodeURIComponent(st.query));
    p.push('max-results=' + max);
    p.push('start-index=' + start);
    p.push('orderby=' + ORDER);
    return base + '?' + p.join('&');
  }

  function itemHTML(entry, withSnippet, number) {
    var title = entry.title && entry.title.$t ? entry.title.$t : '(tanpa judul)';
    var href  = altLink(entry);
    if (!href) return '';
    var img   = thumbOf(entry);
    var pub   = entry.published ? fmtDate(entry.published.$t) : '';
    var upd   = entry.updated ? fmtDate(entry.updated.$t) : pub;
    var meta  = 'Diterbitkan: ' + pub + (upd && upd !== pub ? ' \u00b7 Diperbarui: ' + upd : '');
    var snip  = withSnippet ? snippetOf(entry) : '';
    var thumb = img
      ? '<img class="sm-thumb" src="' + esc(img) + '" alt="' + esc(title) + '" ' +
             'loading="lazy" width="104" height="72" ' +
             'onerror="this.onerror=null;this.style.display=\'none\';this.parentNode.className+=\' is-noimg\';">'
      : '';

    return '<li class="sm-item">' +
             '<span class="sm-index" aria-hidden="true">' + number + '.</span>' +
             '<div class="sm-thumb-box' + (img ? '' : ' is-noimg') + '">' + thumb + '</div>' +
             '<div class="sm-body">' +
               '<a class="sm-item-title" href="' + esc(href) + '" title="' + esc(title) + '">' + esc(title) + '</a>' +
               '<div class="sm-meta">' + ICO_CAL + '<span>' + esc(meta) + '</span></div>' +
               (snip ? '<div class="sm-snippet">' + esc(snip) + '</div>' : '') +
             '</div>' +
           '</li>';
  }

  function renderInto(container, entries, withSnippet) {
    var html = '';
    var startNumber = container.children.length + 1;
    for (var i = 0; i < entries.length; i++) {
      html += itemHTML(entries[i], withSnippet, startNumber + i);
    }
    var tmp = document.createElement('div');
    tmp.innerHTML = '<ul>' + html + '</ul>';
    var src = tmp.firstChild;
    while (src.firstChild) container.appendChild(src.firstChild);
  }

  function headline() {
    if (st.mode === 'search') {
      elDesc.className = 'sm-status';
      elDesc.innerHTML = 'Hasil pencarian untuk <b>&ldquo;' + esc(st.query) + '&rdquo;</b> &mdash; ' +
                         st.total + ' artikel ditemukan, menampilkan ' + st.loaded + '.';
    } else if (st.mode === 'label') {
      elDesc.className = 'sm-status';
      elDesc.innerHTML = 'Kategori <b>&ldquo;' + esc(decodeURIComponent(st.label)) + '&rdquo;</b> &mdash; ' +
                         st.total + ' artikel, menampilkan ' + st.loaded + '.';
    } else {
      elDesc.className = 'sm-status';
      elDesc.innerHTML = 'Total Artikel: <b>' + st.total + '</b> &mdash; menampilkan ' + st.loaded + '.';
    }
  }

  function navMessage(el, text, targetId, label) {
    el.innerHTML = '<div class="sm-end">' + text + '</div>' +
      '<a class="sm-backtop" href="#' + targetId + '" aria-label="' + label + '">' +
      '&#8593; ' + label + '</a>';
  }

  function loadArticles(reset) {
    if (st.busy) return;
    st.busy = true;

    if (reset) {
      elFeed.innerHTML = '';
      elFeedNav.innerHTML = '';
      st.next = 1; st.loaded = 0; st.total = 0; st.done = false;
      elDesc.className = 'sm-status';
      elDesc.textContent = 'Memuat artikel\u2026';
    }

    var reqs = 0;

    (function step() {
      if (st.done || reqs >= MAX_REQ_PER_BATCH) return finish();

      reqs++;
      jsonp(postsUrl(st.next, POSTS_PER_BATCH), function (err, json) {
        if (err) return fail();

        var feed = json.feed || {};
        var entries = feed.entry || [];
        st.total = feed.openSearch$totalResults
          ? parseInt(feed.openSearch$totalResults.$t, 10) || 0
          : st.total;

        if (entries.length === 0) { st.done = true; return finish(); }

        if (st.total && st.loaded < st.total && entries.length > st.total - st.loaded) {
          entries = entries.slice(0, st.total - st.loaded);
        }
        if (!entries.length) {
          st.done = true;
          return finish();
        }

        renderInto(elFeed, entries, SHOW_SNIPPET);
        st.loaded += entries.length;
        st.next   += entries.length;
        if (st.total && st.loaded >= st.total) st.done = true;

        step(); // top-up sampai target terpenuhi
      });
    })();

    function finish() {
      st.busy = false;
      elFeedNav.innerHTML = '';

      if (st.loaded === 0) {
        elDesc.className = 'sm-status is-warn';
        elDesc.textContent = 'Tidak ada artikel yang ditemukan untuk kriteria ini.';
        return;
      }
      headline();

      navMessage(elFeedNav, st.done
        ? 'Seluruh artikel telah ditampilkan.'
        : 'Pemuatan artikel berhenti sebelum seluruh data selesai diterima.',
        'articles-toggle', 'Kembali ke awal bagian artikel');
    }

    function fail() {
      st.busy = false;
      elFeedNav.innerHTML = '';
      if (st.loaded === 0) {
        elDesc.className = 'sm-status is-warn';
        elDesc.textContent = 'Gagal memuat artikel. Silakan coba lagi.';
      }
      elDesc.className = 'sm-status is-warn';
      elDesc.textContent = 'Gagal memuat seluruh artikel. Silakan muat ulang halaman.';
    }
  }

  /* =========================================================
     STATIC PAGES
     ========================================================= */
  var sp = { next: 1, loaded: 0, total: 0, busy: false, done: false };

  function pagesUrl(start, max) {
    return HOME_PAGE + '/feeds/pages/summary?max-results=' + max + '&start-index=' + start;
  }

  function syncAccordion() {
    var bodies = app.querySelectorAll('.sm-acc-body.is-open');
    for (var i = 0; i < bodies.length; i++) {
      bodies[i].style.maxHeight = 'none';
    }
  }

  function loadPages(reset) {
    if (sp.busy) return;
    sp.busy = true;

    if (reset) {
      elPages.innerHTML = '';
      elPageNav.innerHTML = '';
      sp.next = 1; sp.loaded = 0; sp.total = 0; sp.done = false;
    }

    var reqs = 0;

    (function step() {
      if (sp.done || reqs >= MAX_REQ_PER_BATCH) return finish();

      reqs++;
      jsonp(pagesUrl(sp.next, PAGES_PER_BATCH), function (err, json) {
        if (err) return fail();

        var feed = json.feed || {};
        var entries = feed.entry || [];
        sp.total = feed.openSearch$totalResults
          ? parseInt(feed.openSearch$totalResults.$t, 10) || 0
          : sp.total;

        if (entries.length === 0) { sp.done = true; return finish(); }

        renderInto(elPages, entries, false);
        sp.loaded += entries.length;
        sp.next   += entries.length;
        if (sp.total && sp.loaded >= sp.total) sp.done = true;

        step();
      });
    })();

    function finish() {
      sp.busy = false;
      elPageNav.innerHTML = '';

      if (sp.loaded === 0) {
        elPageDsc.className = 'sm-status is-warn';
        elPageDsc.textContent = 'Tidak ada halaman statis yang ditemukan.';
        syncAccordion();
        return;
      }
      elPageDsc.className = 'sm-status';
      elPageDsc.innerHTML = 'Total Halaman: <b>' + sp.total + '</b> &mdash; menampilkan ' + sp.loaded + '.';

      navMessage(elPageNav, sp.done
        ? 'Seluruh halaman telah ditampilkan.'
        : 'Pemuatan halaman berhenti sebelum seluruh data selesai diterima.',
        'pages-toggle', 'Kembali ke awal bagian halaman statis');
      syncAccordion();
    }

    function fail() {
      sp.busy = false;
      elPageDsc.className = 'sm-status is-warn';
      elPageDsc.textContent = 'Gagal memuat halaman statis.';
      elPageNav.innerHTML = '';
      elPageNav.innerHTML = '<div class="sm-end">Pemuatan halaman gagal. Silakan muat ulang halaman.</div>';
      syncAccordion();
    }
  }

  /* =========================================================
     CATEGORIES
     ========================================================= */
  function loadCategories() {
    jsonp(HOME_PAGE + '/feeds/posts/summary?max-results=0', function (err, json) {
      if (err || !elSelect) return;
      var cats = ((json.feed || {}).category || []).slice().sort(function (a, b) {
        return String(a.term).localeCompare(String(b.term));
      });
      var html = '<option value="" selected="selected">Semua Kategori</option>';
      for (var i = 0; i < cats.length; i++) {
        html += '<option value="' + esc(encodeURIComponent(cats[i].term)) + '">' + esc(cats[i].term) + '</option>';
      }
      elSelect.innerHTML = html;
      elSelect.disabled = false;
    });
  }

  /* =========================================================
     UI
     ========================================================= */
  function setBtn(mode) {
    if (!elBtn) return;
    elBtn.dataset.mode = mode;
    if (mode === 'reset') {
      elBtn.className = 'sm-btn is-reset';
      elBtn.innerHTML = ICO_RESET + '<span class="sm-btn-tx">Atur Ulang</span>';
    } else {
      elBtn.className = 'sm-btn';
      elBtn.innerHTML = ICO_SEARCH + '<span class="sm-btn-tx">Telusuri</span>';
    }
  }

  function resetAll() {
    if (elInput) elInput.value = '';
    if (elSelect) elSelect.selectedIndex = 0;
    st.mode = 'all'; st.label = ''; st.query = '';
    setBtn('search');
    loadArticles(true);
  }

  // Accordion
  var toggles = app.querySelectorAll('.sm-acc-toggle');
  for (var ti = 0; ti < toggles.length; ti++) {
    (function (tgl) {
      var body = document.getElementById(tgl.getAttribute('aria-controls'));
      if (!body) return;

      function toggleAccordion() {
        var open = body.classList.toggle('is-open');
        tgl.classList.toggle('is-open', open);
        tgl.setAttribute('aria-expanded', open ? 'true' : 'false');
        body.style.maxHeight = open ? 'none' : '0px';
      }

      tgl.addEventListener('click', toggleAccordion);
      tgl.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAccordion();
        }
      });
    })(toggles[ti]);
  }
  window.addEventListener('resize', syncAccordion);

  // Select arrow state
  if (elSelect) {
    var wrap = elSelect.closest('.sm-select-wrap');
    if (wrap) {
      elSelect.addEventListener('focus', function () { wrap.classList.add('is-open'); });
      elSelect.addEventListener('blur',  function () { wrap.classList.remove('is-open'); });
    }
    elSelect.addEventListener('change', function () {
      var val = this.value;
      if (elInput) elInput.value = '';
      if (val) {
        st.mode = 'label'; st.label = val; st.query = '';
        setBtn('reset');
      } else {
        st.mode = 'all'; st.label = ''; st.query = '';
        setBtn('search');
      }
      loadArticles(true);
    });
  }

  if (elInput) {
    elInput.addEventListener('input', function () {
      if (elBtn && elBtn.dataset.mode === 'reset' && this.value.trim() !== '') setBtn('search');
    });
  }

  if (elForm) {
    elForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var mode = elBtn ? elBtn.dataset.mode : 'search';

      if (mode === 'reset') { resetAll(); return; }

      var q = elInput ? elInput.value.trim() : '';
      var normalizedQuery = q.replace(/\s+/g, '');
      if (normalizedQuery.length < 3 || !/[a-z0-9]/i.test(normalizedQuery)) {
        elDesc.className = 'sm-status is-warn';
        elDesc.textContent = 'Masukkan minimal 3 karakter berupa huruf atau angka untuk memulai penelusuran.';
        return;
      }
      if (elSelect) elSelect.selectedIndex = 0;
      st.mode = 'search'; st.query = q; st.label = '';
      setBtn('reset');
      loadArticles(true);
    });
  }

  /* ---------- BOOT ---------- */
  setBtn('search');
  loadPages(true);
  loadArticles(true);
  loadCategories();
})();
