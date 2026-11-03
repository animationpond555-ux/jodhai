/* จดให้ — ยืนยันตัวตนและเรียกข้อมูล (ไม่มีรหัสลับในไฟล์นี้) */
(function () {
  'use strict';
  if (window.top !== window.self) return; // ไม่ทำงานถ้าถูกเว็บอื่นครอบ
  document.documentElement.classList.add('ok');

  var API = window.JD_API;
  var IDLE_MS = 30 * 60 * 1000;
  var store = {
    get: function (t, k) { try { return window[t].getItem(k) || ''; } catch (e) { return ''; } },
    set: function (t, k, v) { try { window[t].setItem(k, v); } catch (e) { /* ใช้ไม่ได้ก็ไม่เป็นไร */ } },
    del: function (t, k) { try { window[t].removeItem(k); } catch (e) { /* ข้าม */ } }
  };

  // อ่านลิงก์จาก LINE (#k=...&edit=...&tab=...) แล้วลบออกจากแถบที่อยู่
  var h = {};
  String(location.hash || '').replace(/^#/, '').split('&').forEach(function (p) {
    var i = p.indexOf('=');
    if (i > 0) { try { h[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); } catch (e) { /* ข้ามส่วนที่อ่านไม่ได้ */ } }
  });
  if (/^[a-f0-9]{32}$/.test(h.k || '')) {
    if (store.get('localStorage', 'jd_k') !== h.k) { store.del('sessionStorage', 'jd_s'); store.del('localStorage', 'jd_has'); }
    store.set('localStorage', 'jd_k', h.k);
  }
  if (location.hash) history.replaceState(null, '', location.pathname + location.search.replace(/[?&]openExternalBrowser=1/, ''));
  window.JD = { edit: /^[A-Za-z0-9_-]{1,40}$/.test(h.edit || '') ? h.edit : '', tab: /^[0-9]{1,2}$/.test(h.tab || '') ? Number(h.tab) : 0 };

  var K = store.get('localStorage', 'jd_k');
  var S = store.get('sessionStorage', 'jd_s');
  var RO = store.get('sessionStorage', 'jd_ro') === '1';
  var lastAct = Date.now();
  var readyFns = [], started = false, pollTimer = null;

  function post(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), credentials: 'omit', redirect: 'follow', cache: 'no-store', referrerPolicy: 'no-referrer' })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, err: 'net', msg: 'ต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง' }; });
  }
  function setSession(s, ro) {
    S = s; RO = !!ro;
    store.set('sessionStorage', 'jd_s', s);
    store.set('sessionStorage', 'jd_ro', ro ? '1' : '');
  }
  function clearSession() { S = ''; RO = false; store.del('sessionStorage', 'jd_s'); store.del('sessionStorage', 'jd_ro'); }

  // ---------- แปลงไบต์ ----------
  function b64uToBuf(s) {
    s = String(s).replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var b = atob(s), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u.buffer;
  }
  function bufToB64u(buf) {
    var u = new Uint8Array(buf), s = '';
    for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function deviceLabel() {
    var ua = navigator.userAgent || '';
    var dev = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'คอม/มือถือ';
    var br = /Line\//.test(ua) ? 'LINE' : /EdgA?\//.test(ua) ? 'Edge' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /FxiOS|Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'เบราว์เซอร์';
    return dev + ' · ' + br;
  }
  var canPasskey = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);

  // ---------- หน้าล็อก ----------
  var box = document.getElementById('lock');
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function screen(icon, title, sub) {
    box.textContent = '';
    box.hidden = false;
    document.body.classList.add('locked');
    var c = el('div', 'lk-card');
    c.appendChild(el('div', 'lk-logo', 'จดให้'));
    c.appendChild(el('div', 'lk-face', icon));
    c.appendChild(el('div', 'lk-title', title));
    if (sub) { var p = el('div', 'lk-sub'); sub.split('\n').forEach(function (t, i) { if (i) p.appendChild(document.createElement('br')); p.appendChild(document.createTextNode(t)); }); c.appendChild(p); }
    box.appendChild(c);
    return c;
  }
  function btn(c, label, cls, fn) { var b = el('button', cls || 'lk-btn', label); b.type = 'button'; b.addEventListener('click', fn); c.appendChild(b); return b; }
  function note(c, txt) { var n = el('div', 'lk-note'); txt.split('\n').forEach(function (t, i) { if (i) n.appendChild(document.createElement('br')); n.appendChild(document.createTextNode(t)); }); c.appendChild(n); return n; }
  function errLine(c, msg) { var e = c.querySelector('.lk-err') || c.appendChild(el('div', 'lk-err')); e.textContent = msg || ''; }
  function unlock() {
    box.hidden = true; box.textContent = '';
    document.body.classList.remove('locked');
    if (!started) { started = true; readyFns.forEach(function (f) { f(); }); }
  }

  function showNoLink() {
    screen('🔗', 'เปิดจากลิงก์ใน LINE', 'พิมพ์ "แดชบอร์ด" ในแชท LINE "จดให้"\nแล้วกดปุ่มเปิดหน้าสรุป');
  }
  function showDeadLink() {
    store.del('localStorage', 'jd_k'); clearSession();
    screen('🔗', 'ลิงก์นี้ใช้ไม่ได้แล้ว', 'พิมพ์ "แดชบอร์ด" ในแชท LINE "จดให้"\nเพื่อรับลิงก์ใหม่');
  }

  function start() {
    if (!API) { screen('⚙️', 'ยังตั้งค่าไม่ครบ', 'ติดต่อเจ้าของระบบ'); return; }
    if (!K) return showNoLink();
    if (S) return unlock();
    var c = screen('⏳', 'กำลังเตรียม...', '');
    post({ a: 'auth.start', k: K }).then(function (r) {
      if (!r.ok) return r.err === 'link' ? showDeadLink() : (errLine(c, r.msg), btn(c, 'ลองใหม่', 'lk-ghost', start));
      if (r.nodev || !canPasskey) return showPair();
      showScan(r);
    });
  }

  function showScan(r) {
    var c = screen('😊', 'สวัสดี ' + (r.name || ''), '');
    var b = btn(c, 'แตะเพื่อสแกนหน้า', 'lk-btn', function () { doLogin(c, b); });
    note(c, 'ไม่ใช้งาน 30 นาที ล็อกเองอัตโนมัติ\nทำมือถือหาย: พิมพ์ ลบเครื่องทั้งหมด ใน LINE');
    btn(c, 'เครื่องนี้สแกนไม่ได้? ยืนยันผ่าน LINE แทน', 'lk-link', showPair);
  }

  function doLogin(c, b) {
    b.disabled = true; errLine(c, '');
    post({ a: 'auth.start', k: K }).then(function (st) {
      if (!st.ok) { b.disabled = false; return st.err === 'link' ? showDeadLink() : errLine(c, st.msg); }
      if (st.nodev) return showPair();
      return navigator.credentials.get({ publicKey: {
        challenge: b64uToBuf(st.challenge), rpId: st.rpId, timeout: 60000, userVerification: 'required',
        allowCredentials: st.allow.map(function (id) { return { type: 'public-key', id: b64uToBuf(id) }; })
      } }).then(function (cred) {
        var res = cred.response;
        return post({ a: 'auth.finish', cid: st.cid, rawId: bufToB64u(cred.rawId), clientDataJSON: bufToB64u(res.clientDataJSON),
          authenticatorData: bufToB64u(res.authenticatorData), signature: bufToB64u(res.signature), userHandle: res.userHandle ? bufToB64u(res.userHandle) : '' });
      }).then(function (fin) {
        b.disabled = false;
        if (!fin.ok) return errLine(c, fin.msg);
        setSession(fin.s, false); unlock();
      });
    }).catch(function () { b.disabled = false; errLine(c, 'ยกเลิกการสแกน หรือสแกนไม่สำเร็จ ลองใหม่อีกครั้ง'); });
  }

  function showPair() {
    clearInterval(pollTimer);
    var c = screen('🔐', 'ยืนยันว่าเป็นคุณ', 'เครื่องนี้ยังไม่เคยเปิดแดชบอร์ด\nส่งข้อความนี้ในแชท LINE "จดให้"');
    var code = el('div', 'lk-code', '······');
    c.appendChild(code);
    var copy = btn(c, 'คัดลอก แล้วเปิด LINE', 'lk-btn', function () {
      var t = code.textContent;
      var go = function () { location.href = 'https://line.me/R/'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(go, go); else go();
    });
    copy.disabled = true;
    var wait = el('div', 'lk-sub lk-wait', 'กำลังขอรหัส...');
    c.appendChild(wait);
    note(c, 'รหัสใช้ได้ 10 นาที ครั้งเดียว · ทำแค่ครั้งแรกของแต่ละเครื่อง\nคนอื่นแอบเอาลิงก์ไปเปิด ก็ยืนยันไม่ได้ เพราะต้องส่งจาก LINE ของคุณเท่านั้น');
    post({ a: 'pair.start', k: K, label: deviceLabel() }).then(function (r) {
      if (!r.ok) { if (r.err === 'link') return showDeadLink(); wait.textContent = ''; return errLine(c, r.msg); }
      code.textContent = 'ยืนยัน ' + r.code;
      copy.disabled = false;
      wait.textContent = 'รอคุณยืนยันใน LINE... (หน้านี้ไปต่อเอง)';
      var t0 = Date.now();
      pollTimer = setInterval(function () {
        if (Date.now() - t0 > r.ttl) { clearInterval(pollTimer); wait.textContent = ''; errLine(c, 'รหัสหมดเวลาแล้ว'); btn(c, 'ขอรหัสใหม่', 'lk-ghost', showPair); return; }
        if (document.hidden) return;
        post({ a: 'pair.poll', pairId: r.pairId }).then(function (p) {
          if (!p.ok || p.status === 'pending') return;
          clearInterval(pollTimer);
          if (p.status !== 'approved') { wait.textContent = ''; errLine(c, 'รหัสหมดเวลาแล้ว'); btn(c, 'ขอรหัสใหม่', 'lk-ghost', showPair); return; }
          setSession(p.s, true);
          showEnroll(p);
        });
      }, 3000);
    });
  }

  function showEnroll(p) {
    if (!canPasskey) {
      var c0 = screen('👀', 'เข้าดูได้อย่างเดียว', 'เครื่องนี้ใช้สแกนหน้าไม่ได้\nดูข้อมูลได้ 30 นาที แต่แก้ไขไม่ได้');
      btn(c0, 'เข้าดู', 'lk-btn', unlock);
      return;
    }
    var c = screen('🙂', 'ใช้สแกนหน้าเข้าแอป', 'ครั้งต่อไปเปิดแดชบอร์ดแค่สแกนหน้า\nไม่ต้องขอรหัสอีก');
    var b = btn(c, 'เปิดใช้สแกนหน้า', 'lk-btn', function () {
      b.disabled = true; errLine(c, '');
      navigator.credentials.create({ publicKey: {
        challenge: b64uToBuf(p.challenge), rp: p.rp,
        user: { id: b64uToBuf(p.user.id), name: p.user.name, displayName: p.user.displayName },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }], timeout: 60000, attestation: 'none',
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' }
      } }).then(function (cred) {
        var res = cred.response;
        if (!res.getPublicKey || !res.getAuthenticatorData) throw new Error('old');
        return post({ a: 'reg.finish', cid: p.cid, rawId: bufToB64u(cred.rawId), clientDataJSON: bufToB64u(res.clientDataJSON),
          authenticatorData: bufToB64u(res.getAuthenticatorData()), publicKey: bufToB64u(res.getPublicKey()), alg: res.getPublicKeyAlgorithm() });
      }).then(function (r) {
        b.disabled = false;
        if (!r.ok) return errLine(c, r.msg);
        setSession(r.s, false); unlock();
      }).catch(function () { b.disabled = false; errLine(c, 'ตั้งสแกนหน้าไม่สำเร็จ ลองใหม่ หรือกด ไว้ทีหลัง'); });
    });
    btn(c, 'ไว้ทีหลัง (ดูได้อย่างเดียว 30 นาที)', 'lk-ghost', unlock);
    note(c, 'ใช้ Face ID / สแกนนิ้ว / รหัสปลดล็อกมือถือ แล้วแต่เครื่อง · ข้อมูลหน้าไม่ออกจากมือถือ ระบบเราไม่เห็นหน้าคุณ');
  }

  function lockNow(msg) {
    clearSession();
    if (!K) return showNoLink();
    var c = screen('🔒', 'ล็อกแล้ว', msg || 'สแกนหน้าเพื่อเข้าใหม่');
    btn(c, 'เข้าใหม่', 'lk-btn', start);
  }

  ['click', 'keydown', 'touchstart'].forEach(function (t) { document.addEventListener(t, function () { lastAct = Date.now(); }, { passive: true, capture: true }); });
  setInterval(function () { if (S && Date.now() - lastAct > IDLE_MS) { post({ a: 'logout', s: S }); lockNow('ไม่ได้ใช้งาน 30 นาที ล็อกให้แล้ว'); } }, 30000);

  window.JDAPI = {
    onReady: function (f) { if (started) f(); else readyFns.push(f); },
    isReadOnly: function () { return RO; },
    call: function (fn, args) {
      return post({ a: 'call', s: S, fn: fn, args: args }).then(function (r) {
        if (r.ok) return r.r;
        if (r.err === 'auth') lockNow(r.msg);
        throw new Error(r.msg || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
      });
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
