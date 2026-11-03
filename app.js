var TOKEN = '';
var EDIT_ID = JD.edit;
var START_TAB = JD.tab;
var S = { d: null, tab: START_TAB || 0, wOpen: '', sheetMode: 'tx', mv: null, wf: null, dsel: 0, dx: 500, loanDir: 'ให้ยืม', sel: -1, week: 0, bar: -1, taps: 0, phrase: 0, extra: 1000, monthly: 2000, rate: 2, filter: '', edit: null, debtEdit: null, busy: false, animate: true, chars: {} };
var MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
var MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
var LV_BG = {1:'#D8D2CC',2:'#E3D6C3',3:'#C9DFEA',4:'#D3D1E6',5:'#EFDDA0'};
var CAT_COLORS = ['#F48FB1','#B38BEA','#7FCBEA','#FFB48A','#8ED9B8','#F2C84B','#E59AD6','#9BB8F0','#C9C2B8'];
var EMO_BG = ['#FDE8F0','#EEE8FB','#E3F5FC','#FFEBDD','#E6F7EF','#FFF4D6','#FBE6F6','#E8EEFC','#F1EEEA'];
var TABS = [['🏠','สรุป',0],['👛','กระเป๋า',1],['📅','ต้องจ่าย',2],['📋','รายการ',4],['☰','อื่นๆ',6]];
function navOf(t){ return t === 8 ? 2 : (t === 3 || t === 5 || t === 6 || t === 7 || t >= 9) ? 6 : t; }
var PHRASES = {
  1:['มาม่ามื้อที่สามของวันแล้ว...','ขอยืมตังค์หน่อยได้ไหม','ฮือออ เสื้อขาดอีกแล้ว','อดทนไว้ เดี๋ยวเงินเดือนก็ออก'],
  2:['กระเป๋าเริ่มแห้ง คุมหน่อยนะ','ช่วงนี้กินข้าวบ้านก่อนเนอะ','จิ้มเบาๆ นะ ใจบาง','อีกนิดก็รอดแล้ว สู้ๆ'],
  3:['พอกินพอใช้ ไปต่อได้นะ!','จั๊กจี้ๆ อย่าจิ้มบ่อยสิ','วันนี้กินอะไรดีน้า','อย่าลืมจดนะ ไม่งั้นงอน'],
  4:['เก็บเงินเก่งมาก เท่ไปเลย','แว่นนี้ซื้อเงินสดนะ','ใส่สูทแล้วรู้สึกรวย','ออมต่อไป อีกนิดได้มงกุฎ'],
  5:['เศรษฐีใหม่มาแล้ว!','วันนี้เลี้ยงเอง ฮ่าๆ','มงกุฎนี้ของจริงนะ','รวยแล้วอย่าลืมออมต่อนะ']
};

function $(id){ return document.getElementById(id); }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function money(n, dec){ n = Number(n) || 0; return n.toLocaleString('en-US', { minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : (n % 1 ? 2 : 0) }); }
function monthLabel(ym){ var p = ym.split('-'); return MONTHS[+p[1]-1] + ' ' + (+p[0] + 543); }
function dayLabel(iso){ var p = iso.split('-'); var s = (+p[2]) + ' ' + MON[+p[1]-1]; return iso === S.d.today ? 'วันนี้ · ' + s : s; }
function shiftYm(ym, k){ var p = ym.split('-'); var dt = new Date(+p[0], +p[1]-1+k, 1); return dt.getFullYear() + '-' + ('0' + (dt.getMonth()+1)).slice(-2); }
function emo(c){ return (S.d && S.d.emoji[c]) || '📦'; }
function catIdx(c){ var i = S.d.expenseCats.indexOf(c); return i < 0 ? 8 : i; }
function toast(msg){ var t = $('toast'); t.textContent = msg; t.style.display = 'none'; void t.offsetWidth; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function(){ t.style.display = 'none'; }, 2200); }
function fail(e){ S.busy = false; toast((e && e.message) || 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'); }
function num(v){ var n = Number(String(v == null ? '' : v).replace(/,/g, '').trim()); return isFinite(n) ? n : NaN; }
function run(fn){ return JDAPI.call(fn, Array.prototype.slice.call(arguments, 2)); }

/* ---------- โหลดข้อมูล ---------- */
function load(ym, editId){
  run('apiGetMonth', TOKEN, ym || '', editId || '').then(function(d){
    S.d = d; S.sel = -1; S.bar = -1; S.animate = true;
    render();
    loadChar(d.level.lv);
    if (editId) { var t = d.tx.filter(function(x){ return x.id === editId; })[0]; if (t) openEdit(t); else toast('ไม่พบรายการนี้แล้ว'); }
  }).catch(function(e){ $('view').innerHTML = '<div class="loading">' + esc((e && e.message) || 'โหลดไม่สำเร็จ') + '</div>'; });
}
function reload(){ load(S.d ? S.d.ym : ''); }
function loadChar(lv){
  if (S.chars[lv]) { setChar(lv); return; }
  var key = 'jdh_char_' + lv;
  try { var c = sessionStorage.getItem(key); if (c) { S.chars[lv] = c; setChar(lv); return; } } catch (e) {}
  run('apiCharImage', TOKEN, lv).then(function(src){
    if (!src) return;
    S.chars[lv] = src;
    try { sessionStorage.setItem(key, src); } catch (e) {}
    setChar(lv);
  }).catch(function(){});
}
function setChar(lv){ var img = $('charImg'); if (img && S.d && S.d.level.lv === lv) { img.src = S.chars[lv]; img.parentNode.classList.remove('skel'); } }

/* ---------- วาดหน้า ---------- */
function render(){
  renderTabs();
  var v = $('view');
  v.className = 'wrap' + (S.animate ? '' : ' noanim');
  var PAGES = { 0: renderHome, 1: renderWallet, 2: renderDue, 3: renderPlan, 4: renderList, 5: renderSettings, 6: renderMore, 7: renderDebt, 8: renderDueDetail, 9: renderStats, 10: renderLoans, 11: renderBillsPage };
  if (!PAGES[S.tab] || (S.tab === 8 && !dueItem(S.dueSel))) S.tab = S.tab === 8 ? 2 : 0;
  var h = PAGES[S.tab]();
  var BACK = { 3: [6, 'อื่นๆ'], 5: [6, 'อื่นๆ'], 7: [6, 'อื่นๆ'], 9: [6, 'อื่นๆ'], 10: [6, 'อื่นๆ'], 11: [2, 'ต้องจ่าย'], 8: [2, 'ต้องจ่าย'] };
  if (BACK[S.tab]) h = '<div class="in full"><button type="button" class="press" data-act="tab" data-i="' + BACK[S.tab][0] + '" style="border:0;background:transparent;color:var(--lavD);font-weight:700;font-size:14px;padding:4px 0;min-height:36px">‹ ' + BACK[S.tab][1] + '</button></div>' + h;
  v.innerHTML = h;
  masonry(v);
  if (S.tab === 0 || S.tab === 9) afterHome();
  if (S.tab === 0 && S.chars[S.d.level.lv]) setChar(S.d.level.lv);
  S.animate = false;
}
function masonry(v){
  var n = colCount(); if (n < 2) return;
  var kids = [].slice.call(v.children), group = [];
  function flush(before){
    if (!group.length) return;
    if (group.length === 1) { group = []; return; }
    var box = document.createElement('div'); box.className = 'cols'; v.insertBefore(box, before || null);
    var cols = []; for (var i = 0; i < Math.min(n, group.length); i++) { var c = document.createElement('div'); box.appendChild(c); cols.push(c); }
    group.forEach(function(el){ var low = cols[0]; cols.forEach(function(c){ if (c.offsetHeight < low.offsetHeight) low = c; }); low.appendChild(el); });
    group = [];
  }
  kids.forEach(function(el, i){ if (i === 0 || el.classList.contains('full')) flush(el); else group.push(el); });
  flush(null);
}
function colCount(){ var w = window.innerWidth; return w < 900 ? 1 : (w >= 1300 ? 3 : 2); }
var lastCols = colCount();
window.addEventListener('resize', function(){ clearTimeout(window._rz); window._rz = setTimeout(function(){ var c = colCount(); if (c !== lastCols) { lastCols = c; if (S.d) render(); } }, 250); });
function renderTabs(){
  var cur = navOf(S.tab), ni = 0;
  TABS.forEach(function(t, i){ if (t[2] === cur) ni = i; });
  var h = '<div class="ind" style="left:calc(' + (ni * 100 / 5 + 100 / 10).toFixed(3) + '% - 28px)"></div>';
  TABS.forEach(function(t, i){
    var on = t[2] === cur;
    h += '<button type="button" class="press' + (on ? ' on' : '') + '" data-act="tab" data-i="' + t[2] + '"' + (on ? ' aria-current="page"' : '') + '><span class="ic">' + t[0] + '</span><span>' + t[1] + '</span></button>';
  });
  $('tabs').innerHTML = h;
}
function header(title){
  var d = S.d;
  return '<div class="between in"><div><div class="small muted">สวัสดี ' + esc(d.name || '') + '</div><h1 style="font-size:24px">' + title + '</h1></div>' +
    '<div class="row"><button type="button" class="icon-btn press" data-act="month" data-k="-1" aria-label="เดือนก่อน"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></button>' +
    '<button type="button" class="icon-btn press" data-act="month" data-k="1" aria-label="เดือนถัดไป"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg></button></div></div>';
}

/* ---------- หน้า สรุป ---------- */
function renderHome(){
  var d = S.d, L = d.level, h = header(monthLabel(d.ym));
  var phrases = PHRASES[L.lv] || PHRASES[3];
  var say = S.taps ? phrases[S.phrase % phrases.length] : L.say;
  var stepCols = ['#FFB48A','#F48FB1','#C39BEA','#8FD3F0','#8ED9B8'];
  h += assetCard();
  h += '<div class="card in row" style="align-items:stretch;gap:12px;padding:12px">';
  h += '<button type="button" class="charbox" data-act="char" aria-label="แตะตัวละคร"><div class="frame skel" id="charFrame" style="background-color:' + LV_BG[L.lv] + '"><img id="charImg" alt="ตัวละครเลเวล ' + L.lv + ' ' + esc(L.name) + '" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"></div><div id="heart" aria-hidden="true" style="position:absolute;right:6px;top:20px;font-size:26px;opacity:0;pointer-events:none">💖</div></button>';
  h += '<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:8px;justify-content:center">';
  h += '<div class="bubble" id="bubble">' + esc(say) + '</div>';
  h += '<div class="row"><span class="lvtag">Lv.' + L.lv + '</span><span class="disp" style="font-size:18px">' + esc(L.name) + '</span></div>';
  h += '<div class="row" style="gap:4px">' + [1,2,3,4,5].map(function(i){ return '<div style="flex:1 1 0;height:9px;border-radius:999px;background:' + (i <= L.lv ? stepCols[i-1] : '#ECE6F2') + '"></div>'; }).join('') + '</div>';
  var info = L.pct === null ? 'ยังไม่มีเงินเข้าเดือนนี้ จดรายรับด้วยนะ' :
    'เหลือ <b>' + L.pct + '%</b> ของเงินทั้งหมดเดือนนี้' + (L.drop !== null && L.drop >= 0 ? '<br>ใช้ได้อีก <b>฿' + money(L.drop) + '</b> ก่อนตกเลเวล' : '') + (L.up !== null && L.up > 0 && L.lv < 5 ? '<br>เก็บเพิ่มอีก <b>฿' + money(L.up) + '</b> จะขึ้น Lv.' + (L.lv + 1) : '');
  h += '<div class="small" style="line-height:1.5;color:var(--ink2)">' + info + '</div>';
  if (L.carry > 0) h += '<div class="small muted">รวมเงินยกมาจากเดือนก่อน ฿' + money(L.carry) + '</div>';
  h += '</div></div>';

  h += '<div class="card in" style="display:flex;flex-direction:column;gap:10px;animation-delay:.05s">';
  h += '<div style="border-radius:18px;padding:10px 14px;background:linear-gradient(135deg,#E7FAF2,#E8F6FF);border:1px solid #CDEFE2"><div class="small" style="color:#3F5A50">เหลือเก็บเดือนนี้</div><div class="big" style="font-size:32px;color:' + (d.income - d.expense >= 0 ? 'var(--mintD)' : 'var(--pinkD)') + ';line-height:1.2" data-count="' + (d.income - d.expense) + '">฿' + money(d.income - d.expense, true) + '</div></div>';
  h += '<div class="grid2"><div style="border-radius:18px;padding:10px 12px;background:var(--pinkL);border:1.5px solid #F7B5CE"><div class="small" style="color:#7A3555">รายจ่าย</div><div class="big" style="font-size:20px;color:var(--pinkD)" data-count="' + d.expense + '">฿' + money(d.expense, true) + '</div></div>';
  h += '<div style="border-radius:18px;padding:10px 12px;background:var(--skyL);border:1.5px solid #A9DDF0"><div class="small" style="color:#285A6B">รายรับ</div><div class="big" style="font-size:20px;color:var(--skyD)" data-count="' + d.income + '">฿' + money(d.income, true) + '</div></div></div>';
  h += '</div>';

  h += dueSoonCard();
  h += '<div class="card in" style="padding:8px 14px 10px;animation-delay:.2s"><div class="between" style="height:38px"><h2 style="font-size:17px">รายการล่าสุด</h2><button type="button" class="press" data-act="tab" data-i="4" style="border:0;background:transparent;color:var(--lavD);font-weight:700;font-size:13px;min-height:40px">ดูทั้งหมด</button></div>';
  if (!d.tx.length) h += '<div class="empty">ยังไม่มีรายการ ส่งสลิปในแชท LINE หรือกด + ด้านล่าง</div>';
  d.tx.slice(0, 5).forEach(function(t){ h += txRow(t); });
  if (d.tx.length) h += '<div class="small muted" style="text-align:center;padding-top:6px">ปัดรายการไปทางซ้ายเพื่อแก้หรือลบ</div>';
  h += '</div>';
  h += '<button type="button" class="btn primary press in" data-act="new" style="animation-delay:.25s">+ จดรายการใหม่</button>';
  return h;
}
function renderStats(){
  var d = S.d, h = header('ใช้เงินไปกับอะไร');
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:10px;animation-delay:.1s"><div class="between"><h2 style="font-size:17px">ใช้เงินไปกับอะไร</h2><span class="small muted">แตะหมวดเพื่อดูยอด</span></div>';
  var cats = d.expenseCats.filter(function(c){ return d.exp[c] > 0; }).sort(function(a, b){ return d.exp[b] - d.exp[a]; });
  if (!cats.length) h += '<div class="empty">ยังไม่มีรายจ่ายเดือนนี้</div>';
  else {
    var C = 2 * Math.PI * 54, acc = 0, sel = S.sel >= 0 ? cats[S.sel] : null;
    h += '<div class="row" style="gap:12px"><div style="position:relative;width:150px;height:150px;flex-shrink:0"><svg width="150" height="150" viewBox="0 0 150 150" role="img" aria-label="กราฟวงกลมรายจ่ายตามหมวด"><circle cx="75" cy="75" r="54" fill="none" stroke="#F1ECF6" stroke-width="14"/>';
    cats.forEach(function(c, i){
      var len = d.exp[c] / d.expense * C, on = S.sel === i;
      h += '<circle class="seg" data-act="seg" data-i="' + i + '" cx="75" cy="75" r="54" fill="none" stroke="' + CAT_COLORS[catIdx(c)] + '" stroke-width="' + (on ? 22 : 14) + '" data-dash="' + Math.max(0, len - 1.5).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dasharray="' + (S.animate ? '0 ' + C.toFixed(2) : Math.max(0, len - 1.5).toFixed(2) + ' ' + C.toFixed(2)) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" opacity="' + (S.sel >= 0 && !on ? .35 : 1) + '" transform="rotate(-90 75 75)"/>';
      acc += len;
    });
    h += '</svg><div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none"><div style="font-size:22px;line-height:1.1' + (sel ? ';animation:pop .35s cubic-bezier(.34,1.56,.64,1)' : '') + '">' + (sel ? emo(sel) : '💸') + '</div><div class="small muted">' + esc(sel || 'รายจ่ายรวม') + '</div><div class="big" style="font-size:16px">฿' + money(sel ? d.exp[sel] : d.expense) + '</div></div></div>';
    h += '<div style="flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px">';
    cats.forEach(function(c, i){
      var on = S.sel === i;
      h += '<button type="button" class="press row" data-act="seg" data-i="' + i + '" aria-pressed="' + on + '" style="min-height:30px;border:0;border-radius:10px;padding:2px 8px;font-size:13px;background:' + (on ? CAT_COLORS[catIdx(c)] + '33' : 'transparent') + '"><span style="font-size:16px">' + emo(c) + '</span><span style="flex:1 1 auto;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(c) + '</span><span style="font-weight:600">' + Math.round(d.exp[c] / d.expense * 100) + '%</span></button>';
    });
    h += '</div></div>';
  }
  h += '</div>';

  var w = S.week === 0 ? d.last14.slice(7) : d.last14.slice(0, 7);
  var maxV = Math.max.apply(null, d.last14.map(function(x){ return x.amount; }).concat([1]));
  var hot = Math.max.apply(null, w.map(function(x){ return x.amount; }));
  var sum = w.reduce(function(a, x){ return a + x.amount; }, 0);
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:10px;animation-delay:.15s"><div class="between"><h2 style="font-size:17px">ใช้จ่ายรายวัน</h2><div class="seg2" style="padding:3px">' +
    ['7 วันนี้','7 วันก่อน'].map(function(l, i){ return '<button type="button" class="press' + (S.week === i ? ' on' : '') + '" data-act="week" data-i="' + i + '" style="height:32px;padding:0 10px;font-size:12px">' + l + '</button>'; }).join('') + '</div></div>';
  h += '<div style="display:flex;align-items:flex-end;gap:8px;height:150px;padding-top:4px">';
  w.forEach(function(x, i){
    var on = S.bar === i, isHot = x.amount > 0 && x.amount === hot, isToday = x.date === d.today;
    var ht = Math.max(6, Math.round(x.amount / maxV * 100));
    h += '<button type="button" data-act="bar" data-i="' + i + '" aria-label="วันที่ ' + x.day + ' ใช้ ' + money(x.amount) + ' บาท" style="flex:1 1 0;height:150px;border:0;padding:0;background:transparent;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;cursor:pointer">' +
      '<div style="font-size:11px;font-weight:700;transition:opacity .2s;opacity:' + (on || isHot ? 1 : 0) + '">' + money(x.amount) + '</div>' +
      '<div class="bar" data-h="' + ht + '" style="height:' + (S.animate ? 6 : ht) + 'px;background:' + (on ? 'var(--lav)' : isHot ? 'var(--pink)' : '#F7C6D9') + '"></div>' +
      '<div style="font-size:11px;color:var(--muted)">' + (isToday ? 'วันนี้' : x.day) + '</div></button>';
  });
  h += '</div><div class="small" style="color:var(--ink2)">รวม 7 วัน ฿' + money(sum) + ' · เฉลี่ยวันละ ฿' + money(Math.round(sum / 7)) + '</div>';
  h += dayDetail(S.bar >= 0 ? w[S.bar] : w[w.length - 1]);
  h += '</div>';

  return h;
}
/* ---------- ต้องจ่าย ---------- */
function dueIcon(x){
  if (x.kind === 'bill') return x.emoji || '🔁';
  if (x.kind === 'card') return '💳';
  var n = String(x.name || '');
  return /รถ/.test(n) ? '🚗' : /บ้าน|คอนโด/.test(n) ? '🏠' : /บัตร|card|ktc|first ?choice/i.test(n) ? '💳' : /lazada|shopee|tiktok|ช้อป/i.test(n) ? '🛍️' : '🧾';
}
var DUE_BG = { debt: '#FFE3E3', bill: '#EEE8FB', card: '#E3F5FC' };
function dueItem(key){ var p = String(key || '').split(':'); return (S.d.due || []).filter(function(x){ return x.kind === p[0] && x.id === p[1]; })[0] || null; }
function daysTo(day){
  var d = S.d, t = d.today.split('-').map(Number);
  if (d.ym !== d.today.slice(0, 7) || !day) return null;
  var last = new Date(t[0], t[1], 0).getDate();
  return Math.min(day, last) - t[2];
}
function daysToItem(x){
  if (x.kind === 'card' && x.dueDate) { var a = x.dueDate.split('-').map(Number), t = S.d.today.split('-').map(Number); return Math.round((new Date(a[0], a[1] - 1, a[2]) - new Date(t[0], t[1] - 1, t[2])) / 86400000); }
  return daysTo(x.due);
}
function dueSub(x){
  var dd = daysToItem(x), dayTxt = x.kind === 'card' && x.dueDate ? dayLabel(x.dueDate) : x.due, when = x.due ? (dd === null ? 'ทุกวันที่ ' + x.due : dd < 0 ? '<span style="color:#B42318;font-weight:700">เลยกำหนด ' + (-dd) + ' วัน</span>' : dd === 0 ? '<b style="color:#B07A00">ครบวันนี้</b>' : 'ครบ ' + dayTxt + ' · อีก ' + dd + ' วัน') : 'ไม่ได้ตั้งวันครบ';
  if (x.kind === 'debt') return when + ' · เหลือ ฿' + money(x.balance);
  if (x.kind === 'card') return x.noBill ? 'รอบนี้ไม่มียอดบิล · ค้างรวม ฿' + money(x.balance) : when + ' · ขั้นต่ำ ฿' + money(x.min);
  return when + (x.auto ? ' · 🤖 บันทึกเอง' : x.fixed ? '' : ' · ยอดไม่ตายตัว');
}
function dueRow(x){
  var key = x.kind + ':' + x.id, amt = x.paid ? x.paidAmt : x.amount;
  var part = !x.paid && x.paidAmt > 0 ? '<div class="small" style="color:#127F5A">จ่ายแล้ว ฿' + money(x.paidAmt) + ' · เหลือ</div>' : '';
  var right = x.paid ? '<span class="pill" style="background:#E3F7EE;color:#127F5A;font-weight:700;font-size:11px">' + (x.kind === 'bill' && x.auto ? 'บันทึกแล้ว ✓' : 'จ่ายแล้ว ✓') + '</span>'
    : x.noBill ? '' : '<button type="button" class="press" data-act="payopen" data-k="' + esc(key) + '" style="border:0;border-radius:12px;background:linear-gradient(135deg,#F7A8C4,#B38BEA);color:#fff;font-weight:700;font-size:12px;padding:0 12px;min-height:34px">จ่ายแล้ว</button>';
  return '<div class="row" style="gap:10px;min-height:58px;border-top:1px solid #F1EAF4"><button type="button" class="press row" data-act="duesel" data-k="' + esc(key) + '" style="flex:1 1 auto;min-width:0;border:0;background:transparent;padding:6px 0;text-align:left;gap:10px">' +
    '<div class="emo" style="width:38px;height:38px;font-size:19px;background:' + DUE_BG[x.kind] + '">' + esc(dueIcon(x)) + '</div>' +
    '<div style="flex:1 1 auto;min-width:0"><div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(x.name) + '</div><div class="small muted">' + dueSub(x) + '</div></div></button>' +
    '<div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0">' + part + '<b style="font-size:14px">' + (x.kind === 'bill' && !x.fixed && !x.paid ? '~' : '') + '฿' + money(amt) + '</b>' + right + '</div></div>';
}
function dueSoonCard(){
  var list = (S.d.due || []).filter(function(x){ return !x.paid && !x.noBill && x.due && x.amount > 0; });
  if (!list.length || S.d.ym !== S.d.today.slice(0, 7)) return '';
  list.sort(function(a, b){ return daysToItem(a) - daysToItem(b); });
  var h = '<div class="card in" style="padding:8px 14px 10px"><div class="between" style="height:38px"><h2 style="font-size:17px">📅 ใกล้ครบกำหนด</h2><button type="button" class="press" data-act="tab" data-i="2" style="border:0;background:transparent;color:var(--lavD);font-weight:700;font-size:13px">ดูทั้งหมด ›</button></div>';
  list.slice(0, 3).forEach(function(x){ h += dueRow(x); });
  return h + '</div>';
}
function renderDue(){
  var d = S.d, all = (d.due || []).filter(function(x){ return !x.noBill || x.paid; });
  var f = S.dueF || 'all', list = all.filter(function(x){ return f === 'all' || (f === 'debt' ? x.kind !== 'bill' : x.kind === 'bill'); });
  var paidSum = 0, left = 0, nPaid = 0;
  all.forEach(function(x){ paidSum += x.paidAmt || 0; if (x.paid) nPaid++; else left += x.amount; });
  var total = paidSum + left, pct = total > 0 ? Math.round(paidSum / total * 100) : 0;
  var h = header('ต้องจ่าย · ' + MON[+d.ym.slice(5, 7) - 1]);
  h += '<div class="card in" style="background:linear-gradient(120deg,#FFE1CC,#FBD3E3 55%,#DCD7FA);border:0;display:flex;flex-direction:column;gap:6px"><div class="small" style="color:var(--ink2)">ต้องจ่ายทั้งเดือน ฿' + money(total) + '</div><div class="big" style="font-size:28px">' + (left > 0 ? 'เหลืออีก ฿' + money(left) : 'จ่ายครบแล้ว 🎉') + '</div>' +
    '<div class="track" style="background:rgba(255,255,255,.6)"><div class="fill" style="width:' + pct + '%;background:linear-gradient(90deg,var(--mint),var(--sky))"></div></div><div class="small" style="color:var(--ink2)">จ่ายแล้ว ฿' + money(paidSum) + ' · ' + nPaid + ' จาก ' + all.length + ' รายการ</div></div>';
  h += '<div class="seg2 in full" style="grid-template-columns:repeat(3,1fr)">' + [['all','ทั้งหมด'],['debt','หนี้ & บัตร'],['bill','ค่าประจำ']].map(function(o){ return '<button type="button" class="' + (f === o[0] ? 'on' : '') + '" data-act="duef" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
  h += '<div class="card in full" style="padding:4px 14px 8px">';
  if (!list.length) h += '<div class="empty">ยังไม่มีรายการ เพิ่มหนี้หรือค่าใช้จ่ายประจำได้ด้านล่าง</div>';
  list.forEach(function(x){ h += dueRow(x); });
  h += '</div>';
  h += '<div class="row in full" style="gap:8px"><button type="button" class="btn ghost press" data-act="tab" data-i="7" style="flex:1">+ หนี้</button><button type="button" class="btn ghost press" data-act="tab" data-i="11" style="flex:1">+ ค่าประจำ</button></div>';
  h += '<div class="small in full" style="color:var(--ink2);line-height:1.6;padding:0 6px">กด "จ่ายแล้ว" ระบบจะจดรายจ่าย หักเงินจากกระเป๋า หักยอดหนี้ หรือติ๊กค่าประจำให้เอง · ส่งสลิปใน LINE ก็ติ๊กให้เหมือนกัน · ขึ้นเดือนใหม่ค่าประจำจะกลับเป็น "ยังไม่จ่าย"</div>';
  return h;
}
function renderDueDetail(){
  var x = dueItem(S.dueSel), d = S.d;
  var h = '<div class="in"><div class="small muted">' + (x.kind === 'debt' ? 'หนี้' : x.kind === 'card' ? 'บัตรเครดิต' : 'ค่าใช้จ่ายประจำ') + '</div><h1 style="font-size:24px">' + esc(dueIcon(x)) + ' ' + esc(x.name) + '</h1></div>';
  var top = x.kind === 'bill' ? ['ยอดต่อเดือน', (x.fixed ? '' : '~') + '฿' + money(x.amount), x.paid ? 'เดือนนี้จ่ายแล้ว ฿' + money(x.paidAmt) + ' ✓' : 'เดือนนี้ยังไม่จ่าย']
    : x.kind === 'card' ? ['ยอดค้างบัตรทั้งหมด', '฿' + money(x.balance), x.statement > 0 ? 'ยอดบิลรอบนี้ ฿' + money(x.statement) + ' · ต้องจ่ายอีก ฿' + money(x.amount) : 'รอบนี้ยังไม่มียอดบิล']
    : ['หนี้คงเหลือ', '฿' + money(x.balance), x.min > 0 && x.balance > 0 ? 'ถ้าจ่ายเดือนละ ฿' + money(x.min) + ' หมดอีก ~' + Math.ceil(x.balance / x.min) + ' เดือน' : (x.balance <= 0 ? 'ปิดหนี้แล้ว 🎉' : '')];
  h += '<div class="card in" style="background:linear-gradient(120deg,#FFE1CC,#FBD3E3 55%,#DCD7FA);border:0"><div class="small" style="color:var(--ink2)">' + top[0] + '</div><div class="big" style="font-size:28px">' + top[1] + '</div><div class="small" style="color:var(--ink2)">' + top[2] + '</div></div>';
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:4px"><h2 style="font-size:16px">ประวัติการจ่าย</h2>';
  if (!x.hist.length) h += '<div class="empty" style="padding:8px 0">ยังไม่มีประวัติ</div>';
  x.hist.forEach(function(r){
    h += '<button type="button" class="press row" data-act="histtx" data-id="' + esc(r.id) + '" style="border:0;border-top:1px dashed #E3DAF0;background:transparent;padding:8px 0;min-height:44px;text-align:left;gap:8px"><span style="flex:1 1 auto;font-size:13px">' + esc(dayLabel(r.date)) + ' ' + r.date.slice(2, 4) + (r.wallet ? ' · ' + esc(r.wallet) : '') + (r.source === 'สลิป' ? ' · สลิป' : r.source === 'อัตโนมัติ' ? ' · 🤖' : '') + '</span><b style="font-size:13px">฿' + money(r.amount) + ' ✓</b></button>';
  });
  if (x.hist.length) h += '<div class="small muted">แตะรายการเพื่อแก้หรือลบ ลบแล้วยอดหนี้หรือสถานะจะคืนให้เอง</div>';
  h += '</div>';
  var info = x.kind === 'debt' ? [['ทุกวันที่', x.due], ['จ่ายขั้นต่ำ/เดือน', '฿' + money(x.min)], ['ดอกเบี้ย', x.rate + '%/ปี']]
    : x.kind === 'card' ? [['ครบกำหนดทุกวันที่', x.due || '-'], ['ขั้นต่ำรอบนี้', '฿' + money(x.min)]]
    : [['ทุกวันที่', x.due], ['ยอด', x.fixed ? 'ตายตัว' : 'ไม่ตายตัว'], ['ถึงวันแล้ว', x.auto ? '🤖 บันทึกอัตโนมัติ' : '🔔 แค่เตือน']];
  h += '<div class="card in">' + info.map(function(r){ return '<div class="between" style="min-height:40px;border-top:1px solid #F1EAF4;font-size:14px"><span>' + r[0] + '</span><b>' + esc(String(r[1])) + '</b></div>'; }).join('') + '</div>';
  var key = x.kind + ':' + x.id;
  h += '<div class="row in full" style="gap:8px"><button type="button" class="btn ghost press" data-act="dueedit" data-k="' + esc(key) + '" style="flex:1">✎ แก้ไข</button>' + (x.noBill && x.kind === 'card' && !x.balance ? '' : '<button type="button" class="btn primary press" data-act="payopen" data-k="' + esc(key) + '" style="flex:1">' + (x.paid ? 'จ่ายเพิ่ม' : 'จ่ายงวดนี้') + '</button>') + '</div>';
  return h;
}
function renderBillsPage(){ return '<div class="in"><h1 style="font-size:24px">ค่าใช้จ่ายประจำ</h1></div>' + billsCard(); }
function renderMore(){
  var d = S.d, em = (d.goals || []).filter(function(g){ return g.id === 'EMERGENCY'; })[0];
  var lo = (d.loans || []).reduce(function(a, l){ return a + (l.dir === 'ให้ยืม' ? l.left : 0); }, 0);
  var items = [
    [3, '💰', 'วางแผนเงิน', 'เงินเดือน · แบ่งเงิน 50/30/20 · เป้าหมาย · เงินสำรอง', '#E7FAF2'],
    [9, '📊', 'ใช้เงินไปกับอะไร', 'กราฟรายหมวด · ใช้จ่ายรายวัน', '#FDE8F0'],
    [7, '📉', 'จัดการหนี้ & จำลองโปะหนี้', 'เพิ่ม/แก้หนี้ · โปะเพิ่มแล้วหมดเร็วขึ้นแค่ไหน', '#FFE3E3'],
    [11, '🔁', 'จัดการค่าใช้จ่ายประจำ', 'เพิ่ม/แก้ · ตั้งบันทึกอัตโนมัติ', '#EEE8FB'],
    [10, '🤝', 'ยืม / ให้ยืม', 'คนอื่นติดเรา ฿' + money(lo), '#FFF3D6'],
    [5, '⚙️', 'ตั้งค่า', 'เตือนรายวัน · งบรายหมวด · โควตาข้อความ · ลบข้อมูล', '#E8EEFC']];
  var h = '<div class="in"><h1 style="font-size:24px">อื่นๆ</h1></div><div class="card in full" style="padding:4px 14px">';
  items.forEach(function(it){ h += '<button type="button" class="press row" data-act="tab" data-i="' + it[0] + '" style="width:100%;border:0;border-top:1px solid #F1EAF4;background:transparent;padding:12px 0;text-align:left;gap:12px;min-height:60px"><div class="emo" style="width:40px;height:40px;font-size:20px;background:' + it[4] + '">' + it[1] + '</div><div style="flex:1 1 auto;min-width:0"><div style="font-size:15px;font-weight:600">' + it[2] + '</div><div class="small muted">' + it[3] + '</div></div><span style="color:#B9AFCB;font-size:20px">›</span></button>'; });
  return h + '</div>';
}
function drawPaySheet(){
  var p = S.pay, x = dueItem(p.key), d = S.d;
  var ws = (d.wallets || []).filter(function(w){ return x.kind === 'bill' || w.kind !== 'บัตรเครดิต'; });
  var title = x.kind === 'debt' ? 'จ่ายหนี้ ' + x.name : x.kind === 'card' ? 'จ่ายบัตร ' + x.name : 'จ่าย ' + x.name;
  var quick = x.kind === 'debt' ? [['งวดนี้', x.paid ? Math.min(x.min, x.balance) : x.amount], ['ปิดหนี้', x.balance]] : x.kind === 'card' ? [['ขั้นต่ำ', x.min], ['เต็มยอดบิล', x.amount], ['ทั้งหมดที่ค้าง', x.balance]] : [['ยอดปกติ', x.amount]];
  var h = '<div class="between"><h2 id="sheetTitle" style="font-size:18px">' + esc(dueIcon(x)) + ' ' + esc(title) + '</h2><button type="button" class="icon-btn press" data-act="close" aria-label="ปิด">✕</button></div>';
  h += '<label class="f" for="payAmt">จ่ายไปเท่าไหร่ (บาท)<input id="payAmt" class="inp" inputmode="decimal" style="height:52px;font-size:22px" value="' + esc(p.amount) + '"></label>';
  h += '<div class="row" style="flex-wrap:wrap;gap:6px">' + quick.filter(function(q){ return q[1] > 0; }).map(function(q){ return '<button type="button" class="pill press" data-act="payq" data-v="' + q[1] + '" style="border:0;font-weight:700;color:var(--lavD);background:var(--lavL);min-height:32px">' + q[0] + ' ฿' + money(q[1]) + '</button>'; }).join('') + '</div>';
  h += '<div class="small muted">' + (x.kind === 'bill' ? 'จ่ายจากกระเป๋า' : 'จ่ายจากบัญชี') + '</div><div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + '<button type="button" class="chip press' + (!p.wallet ? ' on' : '') + '" data-act="paywal" data-id="" style="font-size:12px">ไม่ระบุ<br><span class="muted" style="font-size:11px">ไม่หักจากกระเป๋าไหน</span></button>' + ws.map(function(w){ return '<button type="button" class="chip press' + (p.wallet === w.id ? ' on' : '') + '" data-act="paywal" data-id="' + esc(w.id) + '" style="font-size:12px">' + (KIND_EMO[w.kind] || '👛') + ' ' + esc(w.name) + '<br><span class="muted" style="font-size:11px">' + (w.kind === 'บัตรเครดิต' ? 'ค้าง ฿' + money(w.owed) : 'มี ฿' + money(w.balance)) + '</span></button>'; }).join('') + '</div>';
  h += '<label class="f" for="payDate">วันที่จ่าย<input id="payDate" class="inp" type="date" value="' + esc(p.date) + '"></label>';
  var wname = ((d.wallets || []).filter(function(w){ return w.id === p.wallet; })[0] || {}).name || 'ไม่ระบุกระเป๋า';
  var eff = x.kind === 'debt' ? ['จดรายจ่ายหมวด 💳 จ่ายหนี้ จาก ' + wname, 'หักหนี้ ' + x.name + ' ลงตามยอดที่จ่าย', 'เก็บไว้ในประวัติการจ่าย']
    : x.kind === 'card' ? ['ย้ายเงินจาก ' + wname + ' ไปจ่ายบัตร (ไม่นับเป็นรายจ่ายซ้ำ)', 'ยอดค้างบัตรลดลงตามที่จ่าย', 'เก็บไว้ในประวัติการจ่าย']
    : ['จดรายจ่ายหมวด ' + emo(x.cat) + ' ' + x.cat + ' จาก ' + wname, 'ติ๊กว่าเดือนนี้จ่ายแล้ว', 'เก็บไว้ในประวัติการจ่าย'];
  h += '<div class="small" style="background:#FFF7E8;border-radius:12px;padding:8px 10px;line-height:1.6">กดบันทึกแล้วระบบจะ:<br>• ' + eff.map(esc).join('<br>• ') + '</div>';
  h += '<button type="submit" class="btn primary press">บันทึกการจ่าย</button>';
  $('sheet').innerHTML = h;
}
function openPay(key){
  var x = dueItem(key), d = S.d; if (!x) return;
  var ws = (d.wallets || []).filter(function(w){ return x.kind === 'bill' || w.kind !== 'บัตรเครดิต'; });
  var def = (x.kind === 'bill' && x.wallet) ? x.wallet : ((ws.filter(function(w){ return w.isDefault; })[0] || ws.filter(function(w){ return w.kind === 'บัญชีธนาคาร'; })[0] || ws[0] || {}).id || '');
  var amt = x.kind === 'debt' ? (x.paid ? Math.min(x.min, x.balance) : x.amount) : x.amount;
  S.pay = { key: key, amount: amt > 0 ? amt : '', wallet: def, date: d.today };
  S.sheetMode = 'pay'; drawSheet(); $('sheetBg').classList.add('open');
}
function doPay(){
  var p = S.pay, x = dueItem(p.key), amt = num($('payAmt').value), date = $('payDate').value || S.d.today;
  if (!(amt > 0)) return toast('ใส่ยอดที่จ่ายก่อนนะ');
  if (x.kind === 'debt' && amt > x.balance + 0.005 && !confirm('ยอดที่จ่ายมากกว่าหนี้คงเหลือ ฿' + money(x.balance) + ' บันทึกเลยไหม')) return;
  S.busy = true;
  run('apiPayDue', TOKEN, { kind: x.kind, id: x.id, amount: amt, wallet: p.wallet, date: date }).then(function(){ S.busy = false; closeEdit(); toast('บันทึกการจ่ายแล้ว ✓'); load(S.d.ym); }).catch(fail);
}
var DAY_SAY = {
  'อาหาร':'วันนี้หมดไปกับของกินเยอะสุด พุงอิ่ม แต่กระเป๋าเริ่มแฟบนะ 😋',
  'ช้อปปิ้ง':'ช้อปปิ้งนำโด่ง ของมันต้องมี หรือแค่อยากมีนะ 🛍️',
  'บิล/ค่าน้ำไฟ':'จ่ายบิลเป็นหลัก ของจำเป็น ไม่ว่ากัน 💡',
  'เดินทาง':'ค่าเดินทางเยอะสุด ไปไหนมาจ๊ะ 🚌',
  'บันเทิง':'สนุกได้ แต่อย่าสนุกจนหมดตัวนะ 🎬',
  'สุขภาพ':'ดูแลสุขภาพ คุ้มค่าที่สุดแล้ว 💊',
  'ที่พัก':'ค่าที่พักก้อนใหญ่ ของจำเป็นจ้า 🏠',
  'จ่ายหนี้':'ปลดหนี้ไปอีกก้อน เก่งมากกก 🎉',
  'อื่นๆ':'จิปาถะเยอะนะ ลองแยกหมวดให้ชัดขึ้นดูไหม 📦'
};
function dayDetail(x){
  if (!x) return '';
  var title = (x.date === S.d.today ? 'วันนี้' : 'วันที่ ' + dayLabel(x.date)) + ' ใช้อะไรไปบ้าง';
  var h = '<div style="border-top:1px solid var(--line,#ECE6F0);padding-top:10px;display:flex;flex-direction:column;gap:8px;animation:pop .35s cubic-bezier(.22,1,.36,1)">';
  h += '<div class="between"><div class="disp" style="font-size:15px">' + esc(title) + '</div><div class="big" style="font-size:17px;color:var(--pinkD)">฿' + money(x.amount) + '</div></div>';
  var items = x.items || [];
  if (!items.length) return h + '<div class="empty" style="padding:6px 0">ไม่มีรายจ่ายวันนั้น เก่งมาก 👏</div></div>';
  var by = {}, order = [];
  items.forEach(function(it){ if (!by[it[0]]) { by[it[0]] = { amt: 0, names: [] }; order.push(it[0]); } by[it[0]].amt += it[2]; by[it[0]].names.push(it[1]); });
  order.sort(function(a, b){ return by[b].amt - by[a].amt; });
  h += '<div style="display:flex;height:14px;border-radius:999px;overflow:hidden;background:#F1ECF6">' + order.map(function(c){ return '<div style="width:' + (by[c].amt / x.amount * 100).toFixed(1) + '%;background:' + CAT_COLORS[catIdx(c)] + '"></div>'; }).join('') + '</div>';
  order.forEach(function(c){
    h += '<div class="row" style="gap:10px;min-height:38px"><div class="emo" style="width:34px;height:34px;font-size:17px;background:' + EMO_BG[catIdx(c)] + '">' + emo(c) + '</div>' +
      '<div style="flex:1 1 auto;min-width:0"><div style="font-size:14px;font-weight:600">' + esc(c) + ' <span class="small muted" style="font-weight:400">· ' + Math.round(by[c].amt / x.amount * 100) + '%</span></div><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(by[c].names.join(', ')) + '</div></div>' +
      '<div style="font-weight:700;color:var(--pinkD)">฿' + money(by[c].amt) + '</div></div>';
  });
  if (DAY_SAY[order[0]]) h += '<div class="small" style="background:#FFF7E8;border-radius:12px;padding:8px 10px;color:var(--ink2)">' + DAY_SAY[order[0]] + '</div>';
  return h + '</div>';
}
function groupInCard(){
  var d = S.d, rows = d.tx.filter(function(t){ return t.type === 'รายรับ' && t.source === 'กลุ่ม'; });
  if (!rows.length) return '';
  var sum = rows.reduce(function(a, t){ return a + t.amount; }, 0), ws = {};
  var h = '<div class="card in" style="display:flex;flex-direction:column;gap:4px"><div class="between"><h2 style="font-size:17px">💬 เงินเข้าจากกลุ่ม · ' + MON[+d.ym.slice(5, 7) - 1] + '</h2><b style="color:var(--skyD)">รวม ฿' + money(sum) + '</b></div>';
  rows.forEach(function(t){ ws[walName(t.wallet) || 'ไม่ระบุ'] = 1;
    h += '<div class="row" style="min-height:40px;border-top:1px solid #F1EAF4;gap:8px;font-size:14px"><span style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">' + esc(t.payee) + '</span><span class="small muted">' + esc(dayLabel(t.date)) + '</span><b style="color:var(--skyD);min-width:70px;text-align:right">+฿' + money(t.amount) + '</b></div>'; });
  return h + '<div class="small muted" style="text-align:right">เข้ากระเป๋า ' + esc(Object.keys(ws).join(', ')) + '</div></div>';
}
function cleanNote(n){ return String(n || '').replace(/ตัดหนี้:\s*/g, 'ตัดหนี้ ').replace(/\s*\(หัก [\d.]+\)/g, '').replace(/ค่าประจำ \d{4}-\d{2}/g, 'ค่าประจำ').replace(/\s*\[[A-Za-z0-9]{6,20}\]/g, '').trim(); }
function editNote(n){ return String(n || '').replace(/ตัดหนี้:.*?\[[A-Za-z0-9]{6,20}\](?:\s*\(หัก [\d.]+\))?\s*/g, '').replace(/ค่าประจำ(?: \d{4}-\d{2})? \[[A-Za-z0-9]{6,20}\]\s*/g, '').trim(); }
function walName(id){ var w = (S.d.wallets || []).filter(function(x){ return x.id === id; })[0]; return w ? w.name : ''; }
function txSign(t){ if (t.type === 'รายจ่าย') return -1; if (t.type === 'รายรับ') return 1; return 0; }
function txRow(t){
  var isExp = t.type === 'รายจ่าย', ci = isExp ? catIdx(t.category) : 2, sg = txSign(t);
  var wn = t.type === 'โยกเงิน' ? '' : walName(t.wallet);
  return '<div class="sw"><button type="button" class="main" data-act="open" data-id="' + esc(t.id) + '">' +
    '<div class="emo" style="background:' + (isExp ? EMO_BG[ci] : 'var(--skyL)') + '">' + emo(t.category) + '</div>' +
    '<div style="flex:1 1 auto;min-width:0"><div style="font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(t.payee) + '</div><div class="small muted">' + esc(t.category) + (t.source === 'กลุ่ม' ? ' · 💬 กลุ่ม' : '') + ' · ' + esc(t.time) + (wn ? ' · 👛 ' + esc(wn) : '') + (cleanNote(t.note) ? ' · ' + esc(cleanNote(t.note)) : '') + '</div></div>' +
    '<div style="font-weight:700;font-size:15px;color:' + (sg < 0 ? 'var(--pinkD)' : sg > 0 ? 'var(--skyD)' : 'var(--lavD)') + '">' + (sg < 0 ? '-' : sg > 0 ? '+' : '') + money(t.amount) + '</div></button>' +
    '<div class="acts"><button type="button" class="press" data-act="open" data-id="' + esc(t.id) + '" style="background:var(--lavL);color:var(--lavD)">แก้ไข</button><button type="button" class="press" data-act="deltx" data-id="' + esc(t.id) + '" style="background:var(--pinkL);color:var(--pinkD)">ลบ</button></div></div>';
}
function afterHome(){
  if (!S.animate) return;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){
    Array.prototype.forEach.call(document.querySelectorAll('circle.seg'), function(c){ c.setAttribute('stroke-dasharray', c.getAttribute('data-dash')); });
    Array.prototype.forEach.call(document.querySelectorAll('.bar[data-h]'), function(b){ b.style.height = b.getAttribute('data-h') + 'px'; });
  }); });
  var els = document.querySelectorAll('[data-count]'), t0 = performance.now();
  function step(now){
    var p = Math.min(1, (now - t0) / 1000), e = 1 - Math.pow(1 - p, 3);
    Array.prototype.forEach.call(els, function(el){ el.textContent = '฿' + money(Number(el.getAttribute('data-count')) * e, true); });
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ---------- กระเป๋าเงิน ---------- */
var W_COLORS = ['#F48FB1','#8ED9B8','#B38BEA','#F2C84B','#7FCBEA','#FFB48A','#E59AD6','#9BB8F0'];
var KIND_EMO = { 'บัญชีธนาคาร': '🏦', 'บัตรเครดิต': '💳', 'อีวอลเล็ต': '📱', 'เงินสด': '👛' };
function assets(){ return (S.d.wallets || []).filter(function(w){ return w.kind !== 'บัตรเครดิต'; }); }
function cardDebts(){
  return (S.d.wallets || []).filter(function(w){ return w.kind === 'บัตรเครดิต' && w.owed > 0; }).map(function(w){
    return { id: 'W' + w.id, name: '💳 ' + w.name, balance: w.owed, rate: 16, min: Math.max(1, Math.ceil((w.statement || w.owed) * 0.08)), due: w.due || 1, virtual: true };
  });
}
function allDebts(){ return S.d.debts.concat(cardDebts()); }
function assetCard(){
  var ws = assets(); if (!(S.d.wallets || []).length) return '';
  var total = ws.reduce(function(a, w){ return a + w.balance; }, 0), pos = ws.reduce(function(a, w){ return a + Math.max(0, w.balance); }, 0);
  var debt = allDebts().reduce(function(a, x){ return a + Math.max(0, x.balance); }, 0);
  var h = '<button type="button" class="card in press" data-act="tab" data-i="1" style="text-align:left;display:flex;flex-direction:column;gap:6px;border:0;background:linear-gradient(120deg,#FFE1CC,#FBD3E3 55%,#DCD7FA)">';
  h += '<div class="small" style="color:var(--ink2)">💰 เงินทั้งหมดทุกบัญชี</div><div class="big" style="font-size:30px" data-count="' + total + '">฿' + money(total, true) + '</div>';
  if (pos > 0) h += '<div style="display:flex;height:10px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.6)">' + ws.map(function(w, i){ return w.balance > 0 ? '<div style="width:' + (w.balance / pos * 100).toFixed(1) + '%;background:' + W_COLORS[i % W_COLORS.length] + '"></div>' : ''; }).join('') + '</div>';
  h += '<div class="small" style="color:var(--ink2)">' + ws.length + ' กระเป๋า' + (debt > 0 ? ' · หนี้คงเหลือ ฿' + money(Math.round(debt)) + ' · ความมั่งคั่งสุทธิ ฿' + money(Math.round(total - debt)) : '') + '</div></button>';
  return h;
}
function renderWallet(){
  var d = S.d, ws = d.wallets || [], as = assets();
  var total = as.reduce(function(a, w){ return a + w.balance; }, 0);
  var h = '<div class="in"><div class="small muted">ทุกบัญชีรวมกัน</div><h1 style="font-size:24px">กระเป๋าเงินของฉัน</h1></div>';
  h += '<div class="card in" style="background:linear-gradient(120deg,#FFE1CC,#FBD3E3 55%,#DCD7FA);border:0"><div class="small" style="color:var(--ink2)">เงินทุกบัญชีรวมกัน</div><div class="big" style="font-size:32px">฿' + money(total, true) + '</div><div class="small" style="color:var(--ink2)">' + ws.length + ' กระเป๋า · โยกเงินไม่นับเป็นรายจ่าย</div></div>';
  if (!ws.length) h += '<div class="card in empty" style="line-height:1.6">ยังไม่มีกระเป๋า เพิ่มบัญชีธนาคาร บัตรเครดิต หรือเงินสดได้เลย<br>ใส่เลขท้ายบัญชี 4 ตัว ระบบจะรู้เองว่าสลิปไหนจ่ายจากบัญชีไหน</div>';
  var GROUPS = [['บัญชีธนาคาร','🏦','#F7B6CF'],['อีวอลเล็ต','📱','#B8E2F5'],['เงินสด','👛','#F5DFA0'],['บัตรเครดิต','💳','#D8C6F5']];
  GROUPS.forEach(function(g){
    var list = ws.filter(function(w){ return w.kind === g[0]; }); if (!list.length) return;
    var sum = list.reduce(function(a, w){ return a + (g[0] === 'บัตรเครดิต' ? w.owed : w.balance); }, 0);
    h += '<div class="in" style="display:flex;flex-direction:column;gap:12px"><div class="row" style="gap:8px;padding:6px 4px 4px;border-bottom:2px solid ' + g[2] + ';margin-top:4px"><span style="font-size:18px">' + g[1] + '</span><span class="disp" style="flex:1 1 auto;font-size:16px">' + (g[0] === 'อีวอลเล็ต' ? 'วอลเล็ต' : g[0]) + '</span><b style="color:' + (g[0] === 'บัตรเครดิต' ? 'var(--pinkD)' : 'var(--ink)') + '">' + (g[0] === 'บัตรเครดิต' ? 'ค้าง ฿' : '฿') + money(sum) + '</b></div>';
    list.forEach(function(w){ var i = ws.indexOf(w);
    var card = w.kind === 'บัตรเครดิต', open = S.wOpen === w.id;
    h += '<div class="card in" style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;animation-delay:' + (i * .04).toFixed(2) + 's' + (open ? ';border:1.5px solid ' + W_COLORS[i % W_COLORS.length] : '') + '">';
    h += '<button type="button" class="press row" data-act="wopen" data-id="' + esc(w.id) + '" aria-expanded="' + open + '" style="border:0;background:transparent;padding:0;text-align:left;gap:12px;min-height:48px">' +
      '<div class="emo" style="width:44px;height:44px;font-size:22px;background:' + W_COLORS[i % W_COLORS.length] + '33">' + (KIND_EMO[w.kind] || '👛') + '</div>' +
      '<div style="flex:1 1 auto;min-width:0"><div style="font-size:15px;font-weight:600">' + esc(w.name) + (w.isDefault ? ' <span class="pill" style="font-size:11px">หลัก</span>' : '') + '</div><div class="small muted">' + esc(w.bank) + (w.acct ? ' · ...' + esc(w.acct.slice(-5)) : '') + (w.pp ? (w.kind === 'อีวอลเล็ต' ? ' · เบอร์ท้าย ' : ' · พร้อมเพย์ ') + esc(String(w.pp).slice(-4)) : '') + '</div></div>' +
      '<div style="text-align:right"><div class="big" style="font-size:18px;color:' + (card ? 'var(--pinkD)' : w.balance < 0 ? 'var(--pinkD)' : 'var(--ink)') + '">' + (card ? '-฿' + money(w.owed) : '฿' + money(w.balance)) + '</div><div style="font-size:11px" class="muted">' + (card ? 'ค้างจ่าย' : 'แตะดูเพิ่ม') + '</div></div></button>';
    if (open) h += card ? cardDetail(w) : bankDetail(w);
    h += '</div>';
  }); h += '</div>'; });
  h += '<div class="row in" style="gap:8px">' + (ws.length > 1 ? '<button type="button" class="btn primary press" data-act="mvopen" style="flex:1">⇄ โยกเงิน</button>' : '') + '<button type="button" class="btn ghost press" data-act="wadd" style="flex:1;border-style:dashed;color:var(--lavD)">+ เพิ่มกระเป๋า</button></div>';
  h += groupInCard();
  return h;
}
function bankDetail(w){
  return '<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:10px"><div style="font-size:14px;font-weight:700">✅ ตรวจยอดให้ตรง</div><div class="small muted">ใส่ยอดจริงจากแอปธนาคารตอนนี้ ถ้าไม่ตรง ระบบจะจดส่วนต่างให้แล้วปรับยอด</div>' +
    '<div class="row"><input class="inp" id="rc_' + esc(w.id) + '" inputmode="decimal" placeholder="ยอดจริง เช่น ' + money(Math.max(0, w.balance)) + '" aria-label="ยอดจริงของ ' + esc(w.name) + '"><button type="button" class="press" data-act="recon" data-id="' + esc(w.id) + '" style="height:44px;border:0;border-radius:12px;background:var(--lavL);color:var(--lavD);font-weight:700;padding:0 14px;white-space:nowrap">ตรวจยอด</button></div>' +
    '<div class="row" style="gap:8px"><button type="button" class="btn ghost press" data-act="wedit" data-id="' + esc(w.id) + '" style="flex:1;height:42px">✎ แก้ไข</button><button type="button" class="btn danger press" data-act="wdel" data-id="' + esc(w.id) + '" style="flex:1;height:42px">ลบกระเป๋า</button></div></div>';
}
function cardDetail(w){
  var h = '<div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:10px">';
  if (w.limit) h += '<div><div class="track"><div class="fill" style="width:' + Math.min(100, Math.max(2, w.owed / w.limit * 100)).toFixed(1) + '%;background:linear-gradient(90deg,var(--lav),var(--pink))"></div></div><div class="small muted" style="margin-top:4px">วงเงิน ฿' + money(w.limit) + ' · ใช้ได้อีก ฿' + money(Math.max(0, w.limit - w.owed)) + '</div></div>';
  var box = function(l, v, hint){ return '<div style="background:#F7F3FB;border-radius:14px;padding:8px 10px"><div class="small muted">' + l + '</div><div style="font-size:16px;font-weight:700">' + v + '</div><div style="font-size:11px;color:var(--ink2);line-height:1.4">' + hint + '</div></div>'; };
  h += '<div class="grid2">' + box('วันตัดรอบบิล', w.cut ? 'ทุกวันที่ ' + w.cut : '-', 'รูดหลังวันนี้ ไปอยู่บิลเดือนหน้า') + box('วันครบกำหนดจ่าย', w.due ? 'ทุกวันที่ ' + w.due : '-', 'วันนั้นจะเตือนใน LINE') +
    box('ยอดเรียกเก็บรอบนี้', '฿' + money(w.dueAmt), w.statement > w.dueAmt ? 'จ่ายไปแล้ว ฿' + money(w.statement - w.dueAmt) : 'ประมาณจากที่จดไว้') + box('จ่ายขั้นต่ำ (8%)', '฿' + money(w.minPay), 'จ่ายแค่นี้ได้ แต่โดนดอก') + '</div>';
  if (w.dueAmt > 0) {
    var full = w.dueAmt, mn = w.minPay, left = full - mn, intr = left * 0.16 / 365 * 30;
    h += '<div style="border-radius:14px;padding:10px 12px;background:linear-gradient(135deg,#E7FAF2,#E8F6FF);font-size:13px;line-height:1.6"><b>จ่ายเต็ม ฿' + money(full) + '</b> = ไม่เสียดอกเลย 🎉</div>' +
      '<div style="border-radius:14px;padding:10px 12px;background:#FFF1F4;font-size:13px;line-height:1.6"><b>จ่ายขั้นต่ำ ฿' + money(mn) + '</b> เหลือค้าง ฿' + money(left) + '<br>ยอดค้างโดนดอก 16% ต่อปี เดือนหน้าเสียดอกเพิ่มประมาณ ฿' + money(Math.round(intr)) + '</div>';
  }
  h += '<div class="small muted" style="line-height:1.6">รูดบัตร: พิมพ์ใน LINE ว่า "รูด 459 ชาบู" · จ่ายบิลบัตร: ส่งสลิปมา หรือกด ⇄ โยกเงิน เข้าบัตรนี้</div>';
  h += '<div class="row"><input class="inp" id="rc_' + esc(w.id) + '" inputmode="decimal" placeholder="ยอดค้างจริงในแอปบัตร" aria-label="ยอดค้างจริงของ ' + esc(w.name) + '"><button type="button" class="press" data-act="recon" data-id="' + esc(w.id) + '" style="height:44px;border:0;border-radius:12px;background:var(--lavL);color:var(--lavD);font-weight:700;padding:0 14px;white-space:nowrap">ตรวจยอด</button></div>';
  h += '<div class="row" style="gap:8px"><button type="button" class="btn ghost press" data-act="wedit" data-id="' + esc(w.id) + '" style="flex:1;height:42px">✎ แก้ไข</button><button type="button" class="btn danger press" data-act="wdel" data-id="' + esc(w.id) + '" style="flex:1;height:42px">ลบกระเป๋า</button></div></div>';
  return h;
}
function renderLoans(){
  var ls = S.d.loans || [], openL = ls.filter(function(l){ return l.left > 0; });
  var mine = openL.filter(function(l){ return l.dir === 'ให้ยืม'; }).reduce(function(a, l){ return a + l.left; }, 0), owe = openL.filter(function(l){ return l.dir !== 'ให้ยืม'; }).reduce(function(a, l){ return a + l.left; }, 0);
  var h = '<div class="in" style="margin-top:6px"><h1 style="font-size:22px">🤝 ยืม / ให้ยืม</h1></div><div class="grid2 in">' +
    '<div style="border-radius:18px;padding:10px 12px;background:#E6F7EF"><div class="small" style="color:#1E5A44">คนอื่นติดเรา</div><div class="big" style="font-size:20px;color:var(--mintD)">฿' + money(mine) + '</div></div>' +
    '<div style="border-radius:18px;padding:10px 12px;background:var(--pinkL)"><div class="small" style="color:#7A3555">เราติดคนอื่น</div><div class="big" style="font-size:20px;color:var(--pinkD)">฿' + money(owe) + '</div></div></div>';
  h += '<div class="card in" style="padding:8px 14px 12px">';
  if (!openL.length) h += '<div class="empty">ไม่มีใครติดเงินกันอยู่ 👍</div>';
  openL.forEach(function(l){
    var m = l.dir === 'ให้ยืม';
    h += '<div class="row" style="min-height:56px;border-top:1px solid #F1EAF4;gap:10px"><div style="font-size:22px">' + (m ? '🙋' : '🫶') + '</div><div style="flex:1 1 auto;min-width:0"><div style="font-size:14px;font-weight:600">' + esc(l.who) + '</div><div class="small muted">' + (m ? 'ให้ยืม' : 'เรายืม') + ' · ' + esc(dayLabel(l.date)) + (l.left < l.amount ? ' · คืนแล้ว ฿' + money(l.amount - l.left) : '') + '</div></div>' +
      '<div style="text-align:right"><div class="big" style="font-size:16px;color:' + (m ? 'var(--mintD)' : 'var(--pinkD)') + '">฿' + money(l.left) + '</div><button type="button" class="press" data-act="loanclose" data-id="' + esc(l.id) + '" style="margin-top:2px;height:32px;padding:0 10px;border:0;border-radius:10px;background:var(--lavL);color:var(--lavD);font-size:12px;font-weight:700">คืนแล้ว ✓</button></div></div>';
  });
  h += '<div style="display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid #F1EAF4"><div class="seg2">' + ['ให้ยืม', 'ยืม'].map(function(v){ return '<button type="button" class="' + (S.loanDir === v ? 'on' : '') + '" data-act="loandir" data-v="' + v + '">' + (v === 'ให้ยืม' ? 'เราให้ยืม' : 'เรายืมมา') + '</button>'; }).join('') + '</div>' +
    '<div class="grid2"><label class="f" for="lnWho">ชื่อคน<input id="lnWho" class="inp" maxlength="40" placeholder="เช่น มิ้นท์"></label><label class="f" for="lnAmt">จำนวนเงิน<input id="lnAmt" class="inp" inputmode="decimal" placeholder="0"></label></div>' +
    '<button type="button" class="btn sky press" data-act="loanadd">+ จดยืมคืน</button><div class="small muted" style="line-height:1.6">ใน LINE พิมพ์ได้: "ให้ยืม มิ้นท์ 500" · "ยืม แม่ 2000" · "คืน มิ้นท์ 500"<br>เงินยืมไม่นับเป็นรายจ่าย/รายรับ แต่ยอดในกระเป๋าจะเปลี่ยนตาม</div></div></div>';
  return h;
}
function openWalletSheet(w){
  S.sheetMode = 'wallet';
  S.wf = w ? JSON.parse(JSON.stringify(w)) : { id: '', name: '', bank: 'กสิกรไทย', kind: 'บัญชีธนาคาร', acct: '', pp: '', opening: '', limit: '', cut: '', due: '', isDefault: !(S.d.wallets || []).length };
  if (w && w.kind === 'บัตรเครดิต') S.wf.opening = w.owed;
  else if (w) S.wf.opening = w.balance;
  S.wf.orig = w ? (w.kind === 'บัตรเครดิต' ? w.owed : w.balance) : null;
  drawSheet(); $('sheetBg').classList.add('open');
}
function grabWallet(){
  var f = S.wf; if (!f) return;
  ['name','acct','pp','opening','limit','cut','due'].forEach(function(k){ var el = $('wf_' + k); if (el) f[k] = el.value; });
  var df = $('wf_def'); if (df) f.isDefault = df.checked;
}
function drawWalletSheet(){
  var f = S.wf, d = S.d, card = f.kind === 'บัตรเครดิต', cash = f.kind === 'เงินสด';
  var h = '<div class="between"><h2 id="sheetTitle" style="font-size:18px">' + (f.id ? 'แก้ไขกระเป๋า' : 'เพิ่มกระเป๋าใหม่') + '</h2><button type="button" class="icon-btn press" data-act="close" aria-label="ปิด">✕</button></div>';
  h += '<div class="f" style="font-size:13px;font-weight:600">ประเภท</div><div class="chips" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + d.walletKinds.map(function(k){ return '<button type="button" class="chip press' + (f.kind === k ? ' on' : '') + '" data-act="wkind" data-v="' + esc(k) + '" style="font-size:12px">' + KIND_EMO[k] + ' ' + esc(k) + '</button>'; }).join('') + '</div>';
  var ew = f.kind === 'อีวอลเล็ต', blist = ew ? d.providers.concat(['อื่นๆ']) : d.banks.filter(function(b){ return b !== 'เงินสด' && b !== 'อีวอลเล็ต' && d.providers.indexOf(b) < 0; });
  if (!cash) h += '<div class="f" style="font-size:13px;font-weight:600">' + (ew ? 'ผู้ให้บริการ' : 'ธนาคาร') + '</div><div class="chips" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + blist.map(function(b, i){ return '<button type="button" class="chip press' + (f.bank === b ? ' on' : '') + '" data-act="wbank" data-v="' + esc(b) + '" style="font-size:11px;min-height:40px;padding:0 4px">' + esc(b) + '</button>'; }).join('') + '</div>';
  h += '<label class="f" for="wf_name">ชื่อกระเป๋า<input id="wf_name" class="inp" maxlength="40" placeholder="' + (card ? 'เช่น บัตรกสิกร' : cash ? 'เช่น เงินสดในกระเป๋า' : 'เช่น บัญชีเงินเดือน') + '" value="' + esc(f.name) + '"></label>';
  if (card) h += '<label class="f" for="wf_acct">เลขท้ายบัตร 4 ตัว<input id="wf_acct" class="inp" inputmode="numeric" maxlength="4" placeholder="1234" value="' + esc(f.acct) + '"></label>';
  else if (ew) h += '<label class="f" for="wf_pp">เบอร์โทร หรือเลขวอลเล็ต (ใส่เต็ม)<input id="wf_pp" class="inp" inputmode="numeric" maxlength="24" placeholder="ใส่ตามที่แอปโชว์ เช่น 0812345678" value="' + esc(f.pp) + '"></label><div class="small muted">แต่ละแอปยาวไม่เท่ากัน ใส่ตามจริงได้เลย สลิปเติมเงินจะขึ้นชื่อผู้ให้บริการกับเลขนี้ ระบบจับคู่จากตรงนี้</div>';
  else if (!cash) h += '<label class="f" for="wf_acct">เลขบัญชีเต็ม (ดูจากแอปธนาคาร)<input id="wf_acct" class="inp" inputmode="numeric" maxlength="20" placeholder="เช่น 123-4-56789-0" value="' + esc(f.acct) + '"></label><div class="small muted">แต่ละธนาคารปิดเลขบนสลิปไม่เหมือนกัน ใส่เลขเต็มไว้ ระบบเทียบเฉพาะตัวเลขที่สลิปโชว์ให้เอง</div><label class="f" for="wf_pp">พร้อมเพย์ เบอร์โทรเต็ม (ถ้ามี)<input id="wf_pp" class="inp" inputmode="numeric" maxlength="14" placeholder="เช่น 0812345678" value="' + esc(f.pp) + '"></label>';
  h += '<label class="f" for="wf_opening">' + (card ? 'ยอดค้างจ่ายตอนนี้ (บาท)' : 'ยอดเงินตอนนี้ (บาท)') + '<input id="wf_opening" class="inp" inputmode="decimal" placeholder="ดูจากแอปธนาคาร" value="' + esc(f.opening) + '"></label>';
  if (card) h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px"><label class="f" for="wf_limit">วงเงิน<input id="wf_limit" class="inp" inputmode="decimal" value="' + esc(f.limit) + '"></label><label class="f" for="wf_cut">ตัดรอบวันที่<input id="wf_cut" class="inp" inputmode="numeric" placeholder="1–31" value="' + esc(f.cut) + '"></label><label class="f" for="wf_due">จ่ายภายในวันที่<input id="wf_due" class="inp" inputmode="numeric" placeholder="1–31" value="' + esc(f.due) + '"></label></div><div class="small muted">ดูวันตัดรอบกับวันครบกำหนดได้จากบิลบัตร หรือแอปของธนาคาร</div>';
  else h += '<label class="row" for="wf_def" style="min-height:44px;font-size:13px"><input type="checkbox" id="wf_def" ' + (f.isDefault ? 'checked' : '') + ' style="width:20px;height:20px;accent-color:var(--lav);margin:0"> ใช้เป็นกระเป๋าหลัก (เวลาพิมพ์จดเอง จะลงกระเป๋านี้)</label>';
  if (f.id && f.orig !== null) h += '<div class="small muted">ถ้าเปลี่ยนยอดเงินตรงนี้ ระบบจะปรับยอดตั้งต้นให้ ยอดปัจจุบันจะเท่ากับที่ใส่</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px"><button type="button" class="btn ghost press" data-act="close">ยกเลิก</button><button type="submit" class="btn primary press">บันทึก</button></div>';
  $('sheet').innerHTML = h;
}
function saveWallet(){
  grabWallet(); var f = S.wf, cur = num(f.opening);
  if (!String(f.name).trim()) return toast('ตั้งชื่อกระเป๋าก่อนนะ');
  if (!isFinite(cur)) return toast('ใส่ยอดเงินให้ถูกต้อง');
  var dg = String(f.acct || '').replace(/\D/g, ''); if (f.acct && (dg.length < 4 || dg.length > 15)) return toast('เลขบัญชีต้องมี 4–15 หลัก');
  var pd = String(f.pp || '').replace(/\D/g, ''); if (pd && (pd.length < 4 || pd.length > 20)) return toast('เบอร์/เลขวอลเล็ตต้องมี 4–20 หลัก');
  var w = (S.d.wallets || []).filter(function(x){ return x.id === f.id; })[0];
  var opening = cur;
  if (w) { var card = f.kind === 'บัตรเครดิต'; opening = card ? w.opening + (cur - w.owed) : w.opening + (cur - w.balance); if (card !== (w.kind === 'บัตรเครดิต')) opening = cur; }
  S.busy = true;
  run('apiSaveWallet', TOKEN, { id: f.id, name: f.name, bank: f.kind === 'เงินสด' ? 'เงินสด' : f.bank, kind: f.kind, acct: dg, pp: pd, opening: opening, limit: num(f.limit) || 0, cut: num(f.cut) || 0, due: num(f.due) || 0, isDefault: !!f.isDefault })
    .then(function(list){ S.busy = false; S.d.wallets = list; closeEdit(); render(); toast('บันทึกกระเป๋าแล้ว ✓'); }).catch(fail);
}
function drawMoveSheet(){
  var m = S.mv, ws = S.d.wallets || [];
  var chip = function(w, on, act, dis){ return '<button type="button" class="chip press' + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + esc(w.id) + '"' + (dis ? ' disabled style="opacity:.35;font-size:12px"' : ' style="font-size:12px"') + '>' + (KIND_EMO[w.kind] || '👛') + ' ' + esc(w.name) + '</button>'; };
  var h = '<div class="between"><h2 id="sheetTitle" style="font-size:18px">โยกเงินระหว่างบัญชี</h2><button type="button" class="icon-btn press" data-act="close" aria-label="ปิด">✕</button></div>';
  h += '<div class="small muted">จาก</div><div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + ws.filter(function(w){ return w.kind !== 'บัตรเครดิต'; }).map(function(w){ return chip(w, m.from === w.id, 'mvfrom', false); }).join('') + '</div>';
  h += '<div class="small muted">ไป</div><div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">' + ws.map(function(w){ return chip(w, m.to === w.id, 'mvto', w.id === m.from); }).join('') + '</div>';
  h += '<label class="f" for="mvAmt">จำนวนเงิน (บาท)<input id="mvAmt" class="inp" inputmode="decimal" style="height:52px;font-size:22px" placeholder="0" value="' + esc(m.amount) + '"></label>';
  var f = ws.filter(function(w){ return w.id === m.from; })[0], t = ws.filter(function(w){ return w.id === m.to; })[0];
  if (f && t) h += '<div class="small" style="background:#F4F0FB;border-radius:12px;padding:8px 12px;line-height:1.6">' + esc(f.name) + ' มี ฿' + money(f.balance) + '<br>' + esc(t.name) + (t.kind === 'บัตรเครดิต' ? ' ค้างจ่าย ฿' + money(t.owed) + ' (โยกเข้าบัตร = จ่ายบิลบัตร)' : ' มี ฿' + money(t.balance)) + '</div>';
  h += '<button type="submit" class="btn primary press">ยืนยันโยกเงิน</button>';
  $('sheet').innerHTML = h;
}
function doMove(){
  var m = S.mv, amt = num($('mvAmt').value);
  if (!m.from || !m.to) return toast('เลือกกระเป๋าต้นทางและปลายทาง');
  if (!(amt > 0)) return toast('ใส่จำนวนเงินก่อนนะ');
  S.busy = true;
  run('apiTransfer', TOKEN, m.from, m.to, amt, '').then(function(){ S.busy = false; closeEdit(); toast('โยกเงินแล้ว ⇄'); reload(); }).catch(fail);
}
function drawInfoSheet(){
  var e = S.edit, isMove = e.type === 'โยกเงิน';
  var h = '<div class="between"><h2 id="sheetTitle" style="font-size:18px">' + (isMove ? 'รายการโยกเงิน' : 'รายการยืมคืน') + '</h2><button type="button" class="icon-btn press" data-act="close" aria-label="ปิด">✕</button></div>';
  h += '<div class="big" style="font-size:28px;color:var(--lavD)">฿' + money(e.amount) + '</div><div style="font-size:14px;line-height:1.7">' + esc(e.payee) + '<br><span class="muted small">' + esc(e.category) + ' · ' + esc(dayLabel(e.date)) + ' ' + esc(e.time) + (isMove ? '' : (walName(e.wallet) ? ' · 👛 ' + esc(walName(e.wallet)) : '')) + '</span></div>';
  h += '<div class="small muted">รายการแบบนี้ไม่นับเป็นรายจ่าย/รายรับ ถ้าจดผิด ลบแล้วจดใหม่ได้</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><button type="button" class="btn danger press" data-act="delcur">ลบ</button><button type="button" class="btn ghost press" data-act="close">ปิด</button></div>';
  $('sheet').innerHTML = h;
}
function oneDebt(B, apr, P){
  var i = apr / 1200, n = 0, it = 0, path = [B];
  if (P <= B * i) return { n: Infinity, it: Infinity, path: path };
  while (B > 0.5 && n < 600) { var x = B * i; it += x; B = Math.max(0, B + x - P); n++; path.push(B); }
  return { n: n, it: it, path: path };
}
function dur(n){ if (!isFinite(n)) return 'ไม่มีวันหมด'; var y = Math.floor(n / 12), m = n % 12; return (y ? y + ' ปี ' : '') + (m ? m + ' เดือน' : (y ? '' : '0 เดือน')); }
function debtCalc(active){
  var x = active[Math.min(S.dsel, active.length - 1)];
  var a = oneDebt(x.balance, x.rate, x.min), b = oneDebt(x.balance, x.rate, x.min + S.dx);
  var first = x.balance * x.rate / 1200;
  var h = '<div class="card in" style="display:flex;flex-direction:column;gap:10px;animation-delay:.1s"><h2 style="font-size:17px">ถ้าโปะเพิ่ม จะหมดเร็วขึ้นแค่ไหน?</h2>';
  h += '<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none">' + active.map(function(y, i){ var on = i === Math.min(S.dsel, active.length - 1); return '<button type="button" class="press" data-act="dsel" data-i="' + i + '" aria-pressed="' + on + '" style="flex-shrink:0;height:40px;padding:0 14px;border-radius:999px;font-weight:700;font-size:13px;' + (on ? 'border:0;background:linear-gradient(135deg,var(--pink),var(--lav));color:#fff' : 'border:1.5px solid #E3D8EC;background:#fff') + '">' + esc(y.name) + '</button>'; }).join('') + '</div>';
  h += '<div style="background:#F7F3FB;border-radius:14px;padding:8px 12px;font-size:13px;line-height:1.7"><div class="between"><span class="muted">ยอดหนี้ตอนนี้</span><b>฿' + money(x.balance) + '</b></div><div class="between"><span class="muted">ดอกเบี้ยต่อปี</span><b>' + x.rate + '%</b></div><div class="between"><span class="muted">จ่ายอยู่เดือนละ</span><b>฿' + money(x.min) + '</b></div></div>';
  h += '<div style="font-size:14px;font-weight:700">โปะเพิ่มเดือนละ</div><div class="chips" style="grid-template-columns:repeat(5,minmax(0,1fr))">' + [0, 300, 500, 1000, 2000].map(function(v){ return '<button type="button" class="chip press' + (S.dx === v ? ' on' : '') + '" data-act="dx" data-v="' + v + '" aria-pressed="' + (S.dx === v) + '" style="font-size:12px;padding:0 2px">' + (v ? '+' + money(v) : 'ไม่โปะ') + '</button>'; }).join('') + '</div>';
  h += '<div class="grid2"><div style="border-radius:18px;padding:10px 12px;background:#F4F0F7"><div class="small muted">จ่ายแบบเดิม</div><div class="big" style="font-size:19px">' + dur(a.n) + '</div><div class="small muted">' + (isFinite(a.n) ? 'หมด ' + futureMonth(a.n) : '') + '</div><div class="small" style="color:var(--pinkD);margin-top:2px">' + (isFinite(a.it) ? 'เสียดอก ฿' + money(Math.round(a.it)) : 'ดอกเบี้ยกินหมด') + '</div></div>' +
    '<div style="border-radius:18px;padding:10px 12px;background:linear-gradient(135deg,#E7FAF2,#E8F6FF);border:1.5px solid #9FE0C6"><div class="small" style="color:#1E5A44">โปะเพิ่ม ฿' + money(S.dx) + '</div><div class="big" style="font-size:19px;color:var(--mintD)">' + dur(b.n) + '</div><div class="small" style="color:#1E5A44">' + (isFinite(b.n) ? 'หมด ' + futureMonth(b.n) : '') + '</div><div class="small" style="color:var(--mintD);margin-top:2px">' + (isFinite(b.it) ? 'เสียดอก ฿' + money(Math.round(b.it)) : '') + '</div></div></div>';
  var lines = [];
  if (!isFinite(a.n)) lines.push('• ตอนนี้จ่ายเดือนละ ฿' + money(x.min) + ' น้อยกว่าดอกเบี้ย (~฿' + money(Math.round(first)) + ') หนี้จะไม่ลดเลย ต้องจ่ายเพิ่ม');
  lines.push('• เดือนแรก ยอดหนี้จะลดลง ฿' + money(Math.max(0, Math.round(x.min + S.dx - first))) + ' (จากเดิมลด ฿' + money(Math.max(0, Math.round(x.min - first))) + ')');
  if (isFinite(a.it) && isFinite(b.it) && S.dx > 0) lines.push('• หมดเร็วขึ้น ' + dur(a.n - b.n) + ' · ประหยัดดอกเบี้ย ฿' + money(Math.round(a.it - b.it)));
  lines.push('• ตอนนี้ดอกเบี้ยกินไปเดือนละประมาณ ฿' + money(Math.round(first)) + ' ยิ่งโปะ ดอกยิ่งน้อยลง');
  h += '<div style="border-radius:16px;padding:10px 12px;background:#FFF7E8;font-size:13px;line-height:1.75">' + (S.dx > 0 && isFinite(b.n) && isFinite(a.n) ? '<div class="disp" style="font-size:16px">โปะเพิ่ม ฿' + money(S.dx) + ' หมดเร็วขึ้น ' + dur(a.n - b.n) + ' 🎉</div>' : '') + lines.join('<br>') + '</div>';
  if (isFinite(b.n)) {
    h += '<div style="display:flex;flex-direction:column;gap:6px"><div style="font-size:13px;font-weight:700">ยอดหนี้ที่เหลือ 6 เดือนแรก (ถ้าโปะเพิ่ม)</div>';
    for (var k = 1; k <= 6; k++) { var v = b.path[k] || 0; h += '<div class="row" style="gap:8px;font-size:12px"><span class="muted" style="width:52px">เดือน ' + k + '</span><div class="track" style="flex:1 1 auto;height:12px"><div class="fill" style="height:12px;width:' + (v / x.balance * 100).toFixed(1) + '%;background:linear-gradient(90deg,var(--mint),var(--sky))"></div></div><b style="width:72px;text-align:right">฿' + money(Math.round(v)) + '</b></div>'; }
    h += '</div>';
  }
  return h + '</div>';
}

/* ---------- คำถาม กลุ่มหาร เงินเดือน ค่าประจำ ---------- */
function salaryCard(){
  var d = S.d, sal = d.salary || 0;
  var bills = (d.bills || []).reduce(function(a, b){ return a + (b.fixed ? b.amount : (b.lastAmt || b.amount)); }, 0);
  var mins = allDebts().filter(function(x){ return x.balance > 0; }).reduce(function(a, x){ return a + x.min; }, 0);
  var free = sal - bills - mins, dim = new Date(+d.ym.slice(0, 4), +d.ym.slice(5, 7), 0).getDate();
  var h = '<div class="card in" style="display:flex;flex-direction:column;gap:8px"><h2 style="font-size:17px">💰 เงินเดือนโดยประมาณ</h2>';
  h += '<div class="grid2"><label class="f" for="salAmt">ต่อเดือน (บาท)<input id="salAmt" class="inp" inputmode="decimal" value="' + (sal || '') + '" placeholder="เช่น 25000"></label><label class="f" for="salDay">ออกทุกวันที่<input id="salDay" class="inp" inputmode="numeric" value="' + (d.payday || '') + '" placeholder="เช่น 25"></label></div>';
  h += '<button type="button" class="btn sky press" data-act="salsave" style="height:42px">บันทึกเงินเดือน</button>';
  if (sal > 0) h += '<div class="grid2"><div style="border-radius:14px;padding:8px 10px;background:#FFF1F4"><div style="font-size:11px;color:#7A3555">ค่าประจำ + หนี้ขั้นต่ำ</div><b>฿' + money(Math.round(bills + mins)) + '</b></div><div style="border-radius:14px;padding:8px 10px;background:#E7FAF2"><div style="font-size:11px;color:#1E5A44">เหลือใช้จริง/เดือน</div><b style="color:' + (free >= 0 ? 'var(--mintD)' : 'var(--pinkD)') + '">฿' + money(Math.round(free)) + '</b></div></div>' +
    '<div class="small" style="background:#FFF7E8;border-radius:12px;padding:8px 10px">≈ ใช้ได้วันละ <b>฿' + money(Math.max(0, Math.floor(free / dim))) + '</b> หลังหักค่าประจำกับหนี้ขั้นต่ำ</div>';
  return h + '</div>';
}
function billsCard(){
  var d = S.d, bs = d.bills || [], f = S.billEdit || { id: '', name: '', emoji: '📺', amount: '', fixed: true, due: '', auto: false, wallet: '', cat: 'บันเทิง' }, wn = {};
  (d.wallets || []).forEach(function(w){ wn[w.id] = w.name; });
  var h = '<div class="card in" style="display:flex;flex-direction:column;gap:6px"><div class="between"><h2 style="font-size:17px">🔁 ค่าใช้จ่ายประจำเดือน</h2><span class="small muted">' + MON[+d.ym.slice(5, 7) - 1] + '</span></div>';
  if (!bs.length) h += '<div class="empty">ยังไม่มี เช่น Netflix, ค่าไฟ, ค่าน้ำ, ค่าเน็ต</div>';
  bs.forEach(function(b){
    h += '<div class="row" style="min-height:54px;border-top:1px solid #F1EAF4;gap:10px"><div style="font-size:22px">' + esc(b.emoji) + '</div><div style="flex:1 1 auto;min-width:0"><div style="font-size:14px;font-weight:600">' + esc(b.name) + '</div><div class="small muted">' + (b.fixed ? 'ตายตัว' : 'ไม่ตายตัว' + (b.lastAmt ? ' · ล่าสุด ฿' + money(b.lastAmt) : '')) + ' · ทุกวันที่ ' + b.due + ' · ' + (b.auto && b.fixed ? '🤖 อัตโนมัติ' + (wn[b.wallet] ? ' จาก ' + esc(wn[b.wallet]) : '') : '🔔 เตือน') + '</div></div>' +
      '<div style="text-align:right"><b>฿' + money(b.fixed ? b.amount : (b.lastAmt || b.amount)) + '</b><br><button type="button" class="press" data-act="billmark" data-id="' + esc(b.id) + '" data-v="' + (b.paid ? 0 : 1) + '" style="border:0;background:transparent;font-size:11px;font-weight:700;padding:2px 0;color:' + (b.paid ? 'var(--mintD)' : '#B07A00') + '">' + (b.paid ? (b.auto && b.fixed ? 'บันทึกแล้ว ✓' : 'จ่ายแล้ว ✓') : (b.auto && b.fixed ? 'รอวันที่ ' + b.due : 'ยังไม่จ่าย')) + '</button></div>' +
      '<button type="button" class="press" data-act="billedit" data-id="' + esc(b.id) + '" aria-label="แก้ ' + esc(b.name) + '" style="width:34px;height:34px;border:0;border-radius:10px;background:var(--lavL);color:var(--lavD)">✎</button></div>';
  });
  h += '<div style="display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid #F1EAF4"><div style="font-size:14px;font-weight:700">' + (f.id ? 'แก้ไขรายการ' : '+ เพิ่มรายการ') + '</div>' +
    '<div style="display:grid;grid-template-columns:60px 1fr;gap:8px"><label class="f" for="bEmo">อิโมจิ<input id="bEmo" class="inp" maxlength="4" value="' + esc(f.emoji) + '"></label><label class="f" for="bName">ชื่อ<input id="bName" class="inp" maxlength="40" placeholder="เช่น Netflix" value="' + esc(f.name) + '"></label></div>' +
    '<div class="grid2"><label class="f" for="bAmt">ยอด (บาท)<input id="bAmt" class="inp" inputmode="decimal" value="' + esc(f.amount) + '"></label><label class="f" for="bDue">จ่ายทุกวันที่<input id="bDue" class="inp" inputmode="numeric" placeholder="1–31" value="' + esc(f.due) + '"></label></div>' +
    '<div class="seg2"><button type="button" class="' + (f.fixed ? 'on' : '') + '" data-act="bfixed" data-v="1">ยอดตายตัว</button><button type="button" class="' + (!f.fixed ? 'on' : '') + '" data-act="bfixed" data-v="0">ไม่ตายตัว</button></div>' +
    '<div style="font-size:13px;font-weight:600">ถึงวันแล้วให้ทำอะไร</div>' +
    '<div class="seg2"><button type="button" class="' + (f.auto && f.fixed ? 'on' : '') + '" data-act="bauto" data-v="1">🤖 บันทึกอัตโนมัติ</button><button type="button" class="' + (!(f.auto && f.fixed) ? 'on' : '') + '" data-act="bauto" data-v="0">🔔 แค่เตือน</button></div>' +
    (f.auto && f.fixed ? '<div class="grid2"><label class="f" for="bWal">จ่ายจาก<select id="bWal" class="inp"><option value="">ไม่ระบุ</option>' + (d.wallets || []).map(function(w){ return '<option value="' + esc(w.id) + '"' + (w.id === f.wallet ? ' selected' : '') + '>' + (KIND_EMO[w.kind] || '') + ' ' + esc(w.name) + '</option>'; }).join('') + '</select></label>' +
      '<label class="f" for="bCat">หมวด<select id="bCat" class="inp">' + d.expenseCats.map(function(c){ return '<option value="' + esc(c) + '"' + (c === f.cat ? ' selected' : '') + '>' + emo(c) + ' ' + esc(c) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="small muted" style="line-height:1.6">ถึงวันจ่าย ระบบจดรายจ่ายให้เอง ไม่ต้องส่งสลิป เหมาะกับที่ตัดบัตรหรือหักบัญชีอัตโนมัติ</div>'
      : (!f.fixed ? '<div class="small muted">ยอดไม่ตายตัวบันทึกอัตโนมัติไม่ได้ จะเตือนแทน</div>' : '')) +
    '<div class="row">' + (f.id ? '<button type="button" class="btn danger press" data-act="billdel" data-id="' + esc(f.id) + '" style="flex:1;height:44px">ลบ</button>' : '') + '<button type="button" class="btn primary press" data-act="billsave" style="flex:2;height:44px">บันทึก</button></div>' +
    '<div class="small muted" style="line-height:1.6">แบบเตือน: จ่ายแล้วส่งสลิป ถ้าชื่อตรง จะติ๊กว่าจ่ายแล้วให้เอง · ทุกอย่างที่ครบวันเดียวกันรวมอยู่ในข้อความเดียว</div></div></div>';
  return h;
}
function grabBill(){
  var f = S.billEdit || { id: '', fixed: true }; S.billEdit = f;
  f.emoji = $('bEmo').value; f.name = $('bName').value; f.amount = $('bAmt').value; f.due = $('bDue').value; if ($('bWal')) { f.wallet = $('bWal').value; f.cat = $('bCat').value; }
  return f;
}
/* ---------- หน้า หนี้สิน ---------- */
function simulate(debts, extra, mode){
  var ds = debts.filter(function(x){ return x.balance > 0; }).map(function(x){ return { name: x.name, bal: x.balance, rate: x.rate, min: x.min }; });
  var budget = ds.reduce(function(a, x){ return a + x.min; }, 0) + extra, month = 0, interest = 0, order = [];
  function alive(){ return ds.some(function(x){ return x.bal > 0.5; }); }
  while (alive() && month < 600) {
    month++;
    ds.forEach(function(x){ if (x.bal > 0) { var i = x.bal * x.rate / 1200; x.bal += i; interest += i; } });
    var pool = budget;
    ds.forEach(function(x){ if (x.bal > 0) { var p = Math.min(x.bal, x.min); x.bal -= p; pool -= p; } });
    var tg = ds.filter(function(x){ return x.bal > 0.5; }).sort(function(a, b){ return mode === 'rate' ? (b.rate - a.rate) || (a.bal - b.bal) : (a.bal - b.bal) || (b.rate - a.rate); });
    for (var k = 0; k < tg.length && pool > 0; k++) { var q = Math.min(tg[k].bal, pool); tg[k].bal -= q; pool -= q; }
    ds.forEach(function(x){ if (x.bal <= 0.5 && order.indexOf(x.name) < 0) { x.bal = 0; order.push(x.name); } });
  }
  return { months: month, interest: interest, order: order, done: !alive() };
}
function futureMonth(k){ var now = new Date(); var dt = new Date(now.getFullYear(), now.getMonth() + k, 1); return MON[dt.getMonth()] + ' ' + String(dt.getFullYear() + 543).slice(-2); }
function renderDebt(){
  var d = S.d, debts = allDebts(), active = debts.filter(function(x){ return x.balance > 0; });
  var total = active.reduce(function(a, x){ return a + x.balance; }, 0), mins = active.reduce(function(a, x){ return a + x.min; }, 0);
  var inc = d.income > 0 ? d.income : (d.level.base || 0);
  var dti = inc > 0 ? mins / inc * 100 : null;
  var lvl = dti === null ? 'none' : dti > 40 ? 'high' : dti > 30 ? 'mid' : 'ok';
  var h = '<div class="in"><div class="small muted">ภาระที่ต้องจัดการ</div><h1 style="font-size:24px">หนี้สินของฉัน</h1></div>';
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:10px"><div><div class="small muted">หนี้คงเหลือทั้งหมด</div><div class="big" style="font-size:30px;color:var(--pinkD)">฿' + money(total) + '</div><div class="small" style="color:var(--ink2)">' + active.length + ' ก้อน</div></div>';
  h += '<div class="grid2"><div style="border-radius:16px;background:var(--pinkL);padding:8px 12px"><div class="small" style="color:#7A3555">จ่ายขั้นต่ำรวม/เดือน</div><div style="font-size:18px;font-weight:700">฿' + money(mins) + '</div></div>';
  h += '<div style="border-radius:16px;padding:8px 12px;background:' + (lvl === 'high' ? '#FFE3E0' : lvl === 'mid' ? '#FFF2D6' : '#E3F5EC') + '"><div class="small" style="color:var(--ink2)">ภาระหนี้ต่อรายได้</div><div style="font-size:18px;font-weight:700">' + (dti === null ? '-' : Math.round(dti) + '%') + '</div></div></div>';
  h += '<div class="small" style="line-height:1.5;color:var(--ink2)">' + (lvl === 'none' ? 'จดรายรับเดือนนี้ก่อน ระบบจะคำนวณภาระหนี้ต่อรายได้ให้' : lvl === 'high' ? 'ภาระหนี้เกิน 40% ของรายได้ ถือว่าหนักแล้ว ควรหยุดก่อหนี้ใหม่และเร่งปิดก้อนที่ดอกสูงก่อน' : lvl === 'mid' ? 'ภาระหนี้ 30–40% ยังไหว แต่ระวังการก่อหนี้เพิ่ม' : 'ภาระหนี้ต่ำกว่า 30% ของรายได้ อยู่ในเกณฑ์ดี') + '</div></div>';

  h += '<div class="card in" style="padding:12px 14px;animation-delay:.05s"><h2 style="font-size:17px;margin-bottom:4px">หนี้แต่ละก้อน</h2>';
  if (!debts.length) h += '<div class="empty">ยังไม่มีหนี้ที่บันทึกไว้ เพิ่มได้ด้านล่าง</div>';
  debts.forEach(function(x, i){
    h += '<div style="display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid #F1EAF4"><div class="row"><div style="width:12px;height:12px;border-radius:50%;flex-shrink:0;background:' + CAT_COLORS[i % CAT_COLORS.length] + '"></div>' +
      '<div style="flex:1 1 auto;min-width:0;font-size:15px;font-weight:600">' + esc(x.name) + (x.balance <= 0 ? ' 🎉' : '') + '</div><div style="font-size:15px;font-weight:700;color:' + (x.balance > 0 ? 'var(--pinkD)' : 'var(--mintD)') + '">' + (x.balance > 0 ? '฿' + money(x.balance) : 'ปิดแล้ว') + '</div>' +
      (x.virtual ? '<button type="button" class="press" data-act="tab" data-i="1" style="height:36px;border:0;border-radius:10px;background:var(--lavL);color:var(--lavD);font-size:12px;font-weight:700;padding:0 10px">ดูบัตร</button></div>' :
      '<button type="button" class="press" data-act="editdebt" data-id="' + esc(x.id) + '" aria-label="แก้หนี้ ' + esc(x.name) + '" style="width:36px;height:36px;border:0;border-radius:10px;background:var(--lavL);color:var(--lavD);font-weight:700">✎</button>' +
      '<button type="button" class="press" data-act="deldebt" data-id="' + esc(x.id) + '" aria-label="ลบหนี้ ' + esc(x.name) + '" style="width:36px;height:36px;border:0;border-radius:10px;background:#F6EEF6;color:#8A5A7A;font-weight:700">✕</button></div>') +
      '<div class="row" style="flex-wrap:wrap;gap:6px;font-size:12px;color:var(--ink2)"><span class="pill">ดอกเบี้ย ' + x.rate + '%/ปี</span><span class="pill">ขั้นต่ำ ฿' + money(x.min) + '</span><span class="pill">จ่ายทุกวันที่ ' + x.due + '</span></div></div>';
  });
  h += '</div>';

  if (active.length) h += debtCalc(active);

  var f = S.debtEdit || { id: '', name: '', balance: '', rate: '', min: '', due: '' };
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:10px;animation-delay:.15s"><h2 style="font-size:17px">' + (f.id ? 'แก้ไขหนี้' : 'เพิ่มหนี้ก้อนใหม่') + '</h2>' +
    '<label class="f" for="dn">ชื่อหนี้<input id="dn" class="inp" maxlength="60" placeholder="เช่น บัตรเครดิต, ผ่อนรถ" value="' + esc(f.name) + '"></label>' +
    '<div class="grid2"><label class="f" for="db">ยอดคงเหลือ (บาท)<input id="db" class="inp" inputmode="decimal" placeholder="0" value="' + esc(f.balance) + '"></label>' +
    '<label class="f" for="dr">ดอกเบี้ยต่อปี (%)<input id="dr" class="inp" inputmode="decimal" placeholder="เช่น 16" value="' + esc(f.rate) + '"></label>' +
    '<label class="f" for="dm">จ่ายขั้นต่ำ/เดือน<input id="dm" class="inp" inputmode="decimal" placeholder="0" value="' + esc(f.min) + '"></label>' +
    '<label class="f" for="dd">จ่ายทุกวันที่<input id="dd" class="inp" inputmode="numeric" placeholder="1–31" value="' + esc(f.due) + '"></label></div>' +
    '<div class="row">' + (f.id ? '<button type="button" class="btn ghost press" data-act="canceldebt" style="flex:1">ยกเลิก</button>' : '') + '<button type="button" class="btn primary press" data-act="savedebt" style="flex:2">' + (f.id ? 'บันทึกการแก้ไข' : 'บันทึกหนี้ก้อนนี้') + '</button></div>' +
    '<div class="small muted" style="line-height:1.5">จ่ายหนี้แล้วส่งสลิปมาใน LINE ถ้าชื่อผู้รับตรงกับชื่อหนี้ จะตัดยอดให้อัตโนมัติ · บัตรเครดิตเพิ่มเป็นกระเป๋าในแท็บ 👛 แทน</div></div>';
  h += '<div class="small" style="color:var(--ink2);line-height:1.6;padding:0 6px">ตัวเลขเป็นการประมาณจากยอดที่กรอก ช่วยตัดสินใจเท่านั้น ไม่ใช่คำแนะนำจากผู้เชี่ยวชาญ ถ้าผ่อนไม่ไหว ลองติดต่อโครงการคลินิกแก้หนี้เพื่อขอลดดอกเบี้ยหรือยืดเวลาผ่อน</div>';
  return h;
}

/* ---------- หน้า วางแผน ---------- */
function fv(m, r, n){ var i = r / 1200; return i === 0 ? m * n : m * (Math.pow(1 + i, n) - 1) / i; }
function renderPlan(){
  var d = S.d, inc = d.income;
  var needs = 0, wants = 0, debtPay = d.exp['จ่ายหนี้'] || 0;
  d.expenseCats.forEach(function(c){ var v = d.exp[c] || 0; if (c === 'จ่ายหนี้') return; if (d.needs.indexOf(c) >= 0) needs += v; else wants += v; });
  var saveNow = Math.max(0, inc - d.expense) + debtPay;
  var emerg = d.goals.filter(function(g){ return g.id === 'EMERGENCY'; })[0];
  var avg = d.avgExpense || d.expense;
  var eTarget = Math.round(avg * 3), eSaved = emerg ? emerg.saved : 0;
  var goals = d.goals.filter(function(g){ return g.id !== 'EMERGENCY'; });
  var goalNeed = goals.reduce(function(a, g){ return a + Math.max(0, (g.target - g.saved) / Math.max(1, monthsLeft(g))); }, 0);
  var eNeed = eSaved < eTarget ? Math.min(2000, eTarget - eSaved) : 0;
  var need = goalNeed + eNeed, left = d.income - d.expense, gap = left - need;
  var h = '<div class="in"><div class="small muted">' + monthLabel(d.ym) + '</div><h1 style="font-size:24px">วางแผนอนาคต</h1></div>';
  h += salaryCard();
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:4px"><div class="small muted">เป้าหมายทั้งหมดต้องเก็บ</div><div class="big" style="font-size:26px">฿' + money(Math.round(need)) + '<span class="small muted" style="font-family:inherit;font-weight:500"> /เดือน</span></div>' +
    '<div class="small" style="border-radius:12px;padding:6px 10px;' + (gap >= 0 ? 'background:#E6F7EF;color:#1E5A44' : 'background:#FFF2D6;color:#6B4A00') + '">' + (need === 0 ? 'ยังไม่มีเป้าหมาย ลองเพิ่มด้านล่างดูนะ' : gap >= 0 ? 'เดือนนี้เหลือเก็บ ฿' + money(left) + ' พอแล้ว เหลืออีก ฿' + money(Math.round(gap)) : 'เดือนนี้เหลือเก็บ ฿' + money(left) + ' ยังขาดอีก ฿' + money(Math.round(-gap))) + '</div></div>';

  h += '<div class="card in" style="display:flex;flex-direction:column;gap:8px;animation-delay:.05s"><h2 style="font-size:17px">แบ่งเงินเดือนยังไงดี</h2>';
  if (!(inc > 0)) h += '<div class="small" style="color:var(--ink2)">จดรายรับเดือนนี้ก่อน ระบบจะแนะนำการแบ่งเงินให้</div>';
  else {
    h += '<div class="small" style="color:var(--ink2)">สูตร 50 / 30 / 20 จากรายรับ ฿' + money(inc) + '</div><div class="row" style="gap:0;height:16px;border-radius:999px;overflow:hidden"><div style="width:50%;height:16px;background:var(--sky)"></div><div style="width:30%;height:16px;background:#F7A8C4"></div><div style="width:20%;height:16px;background:var(--mint)"></div></div>';
    h += '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px">' +
      planBox('ของจำเป็น', inc * .5, needs, '#E8F6FC', '#285A6B', true) + planBox('ใช้ส่วนตัว', inc * .3, wants, '#FDEBF2', '#7A3555', true) + planBox('ออม/โปะหนี้', inc * .2, saveNow, '#E6F7EF', '#1E5A44', false) + '</div>';
    h += '<div class="small muted">ของจำเป็น = อาหาร เดินทาง บิล ที่พัก สุขภาพ</div>';
  }
  h += '</div>';

  var ePct = eTarget > 0 ? Math.min(100, eSaved / eTarget * 100) : 0;
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:8px;animation-delay:.1s"><div class="between"><h2 style="font-size:17px">🛟 เงินสำรองฉุกเฉิน</h2><div style="font-size:13px;font-weight:700">฿' + money(eSaved) + ' / ฿' + money(eTarget) + '</div></div>' +
    '<div class="track" style="height:12px"><div class="fill" style="height:12px;width:' + Math.max(2, ePct).toFixed(1) + '%;background:linear-gradient(90deg,var(--peach),var(--pink))"></div></div>' +
    '<div class="small" style="line-height:1.5;color:var(--ink2)">เป้าขั้นต่ำ 3 เท่าของรายจ่ายเฉลี่ยต่อเดือน (฿' + money(Math.round(avg)) + ' × 3) · เป้าที่ปลอดภัยกว่าคือ 6 เท่า (฿' + money(Math.round(avg * 6)) + ')</div>' +
    '<div class="row"><label class="f" for="eAdd" style="flex:1">เพิ่มเงินเข้าเงินสำรอง<input id="eAdd" class="inp" inputmode="decimal" placeholder="เช่น 1000"></label><button type="button" class="btn sky press" data-act="eadd" style="align-self:flex-end">+ เพิ่ม</button></div></div>';

  h += '<div class="card in" style="padding:12px 14px;animation-delay:.15s"><h2 style="font-size:17px;margin-bottom:2px">🎯 เป้าหมายของฉัน</h2>';
  if (!goals.length) h += '<div class="empty">ยังไม่มีเป้าหมาย เช่น เที่ยวญี่ปุ่น ซื้อโน้ตบุ๊ก ดาวน์คอนโด</div>';
  goals.forEach(function(g){
    var ml = monthsLeft(g), per = Math.max(0, (g.target - g.saved) / Math.max(1, ml)), done = g.saved >= g.target;
    h += '<div style="display:flex;flex-direction:column;gap:6px;padding:10px 0;border-top:1px solid #F1EAF4"><div class="row"><div style="flex:1 1 auto;min-width:0;font-size:15px;font-weight:600">' + esc(g.name) + (done ? ' 🎉' : '') + '</div><div style="font-size:13px;font-weight:700">฿' + money(g.saved) + ' / ฿' + money(g.target) + '</div>' +
      '<button type="button" class="press" data-act="delgoal" data-id="' + esc(g.id) + '" aria-label="ลบเป้าหมาย ' + esc(g.name) + '" style="width:34px;height:34px;border:0;border-radius:10px;background:#F6EEF6;color:#8A5A7A;font-weight:700">✕</button></div>' +
      '<div class="track"><div class="fill" style="width:' + Math.max(2, Math.min(100, g.saved / g.target * 100)).toFixed(1) + '%;background:linear-gradient(90deg,var(--sky),var(--lav))"></div></div>' +
      '<div class="small" style="color:var(--ink2)">' + (done ? 'ครบเป้าแล้ว เก่งมาก!' : 'เหลืออีก ' + ml + ' เดือน · ต้องเก็บเดือนละ <b>฿' + money(Math.round(per)) + '</b>') + '</div>' +
      '<div class="row"><input class="inp" id="ga_' + esc(g.id) + '" inputmode="decimal" placeholder="เพิ่มเงินเข้าเป้านี้" aria-label="เพิ่มเงินเข้าเป้า ' + esc(g.name) + '" style="height:40px"><button type="button" class="press" data-act="gadd" data-id="' + esc(g.id) + '" style="height:40px;border:0;border-radius:12px;background:var(--lavL);color:var(--lavD);font-weight:700;padding:0 14px;white-space:nowrap">+ เพิ่ม</button></div></div>';
  });
  h += '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:6px;padding-top:10px;border-top:1px solid #F1EAF4">' +
    '<label class="f" for="gn" style="font-size:12px">เป้าหมาย<input id="gn" class="inp" maxlength="60" placeholder="เช่น ซื้อโน้ตบุ๊ก"></label>' +
    '<label class="f" for="gt" style="font-size:12px">ยอดเงิน<input id="gt" class="inp" inputmode="decimal" placeholder="0"></label>' +
    '<label class="f" for="gm" style="font-size:12px">กี่เดือน<input id="gm" class="inp" inputmode="numeric" placeholder="12"></label></div>' +
    '<button type="button" class="btn sky press" data-act="addgoal" style="width:100%;margin-top:8px">+ เพิ่มเป้าหมาย</button></div>';

  var yrs = [1, 5, 10], vals = yrs.map(function(y){ return fv(S.monthly, S.rate, y * 12); }), mx = vals[2] || 1, cols = ['var(--peach)','var(--pink)','var(--lav)'];
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:8px;animation-delay:.2s"><h2 style="font-size:17px">ถ้าเก็บต่อเนื่อง จะมีเงินเท่าไหร่</h2><div class="small" style="color:var(--ink2)">เก็บเดือนละ</div><div class="chips" style="grid-template-columns:repeat(4,minmax(0,1fr))">';
  [1000, 2000, 3000, 5000].forEach(function(v){ h += '<button type="button" class="chip press' + (S.monthly === v ? ' on' : '') + '" data-act="monthly" data-v="' + v + '" aria-pressed="' + (S.monthly === v) + '">' + money(v) + '</button>'; });
  h += '</div><div class="small" style="color:var(--ink2)">ผลตอบแทนต่อปีโดยประมาณ</div><div class="chips" style="grid-template-columns:repeat(3,minmax(0,1fr))">';
  [[0,'เก็บเฉยๆ 0%'],[2,'ฝากประจำ ~2%'],[5,'ลงทุน ~5%']].forEach(function(r){ h += '<button type="button" class="chip press' + (S.rate === r[0] ? ' on' : '') + '" data-act="rate" data-v="' + r[0] + '" aria-pressed="' + (S.rate === r[0]) + '">' + r[1] + '</button>'; });
  h += '</div><div style="display:flex;align-items:flex-end;gap:10px;height:150px;padding-top:6px">';
  yrs.forEach(function(y, i){ h += '<div style="flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:150px"><div style="font-size:12px;font-weight:700">฿' + money(Math.round(vals[i])) + '</div><div class="bar" style="height:' + Math.max(8, Math.round(vals[i] / mx * 100)) + 'px;background:' + cols[i] + '"></div><div class="small" style="color:var(--ink2)">' + y + ' ปี</div></div>'; });
  h += '</div></div><div class="small" style="color:var(--ink2);line-height:1.6;padding:0 6px">ตัวเลขทั้งหมดเป็นการประมาณ ผลตอบแทนจริงขึ้นลงได้ ใช้เพื่อช่วยวางแผนเท่านั้น ไม่ใช่คำแนะนำการลงทุนจากผู้เชี่ยวชาญ</div>';
  return h;
}
function planBox(label, target, actual, bg, color, isSpend){
  var ok = isSpend ? actual <= target : actual >= target;
  return '<div style="background:' + bg + ';border-radius:14px;padding:8px 10px"><div class="small" style="color:' + color + '">' + label + '</div><div style="font-size:15px;font-weight:700">฿' + money(Math.round(target)) + '</div><div style="font-size:11px;color:var(--ink2)">' + (isSpend ? 'ใช้จริง' : 'ทำได้') + ' ฿' + money(Math.round(actual)) + (ok ? ' ✓' : ' !') + '</div></div>';
}
function monthsLeft(g){
  var c = (g.created || S.d.today).split('-'), t = S.d.today.split('-');
  var passed = (+t[0] - +c[0]) * 12 + (+t[1] - +c[1]);
  return Math.max(1, g.months - Math.max(0, passed));
}

/* ---------- หน้า รายการ ---------- */
function renderList(){
  var d = S.d, h = header('รายการ · ' + MON[+d.ym.split('-')[1]-1]);
  var used = {};
  d.tx.forEach(function(t){ used[t.category] = 1; });
  var filters = [''].concat(d.expenseCats.concat(d.incomeCats).filter(function(c){ return used[c]; }));
  h += '<div class="in full" style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;padding:2px 0">';
  filters.forEach(function(c){ var on = S.filter === c; h += '<button type="button" class="press" data-act="filter" data-c="' + esc(c) + '" aria-pressed="' + on + '" style="flex-shrink:0;height:40px;padding:0 14px;border-radius:999px;font-weight:700;font-size:13px;' + (on ? 'border:0;background:linear-gradient(135deg,var(--pink),var(--lav));color:#fff' : 'border:1.5px solid #E3D8EC;background:#fff') + '">' + (c ? emo(c) + ' ' + esc(c) : 'ทั้งหมด') + '</button>'; });
  h += '</div>';
  var rows = d.tx.filter(function(t){ return !S.filter || t.category === S.filter; });
  var sum = rows.reduce(function(a, t){ return a + txSign(t) * t.amount; }, 0);
  h += '<div class="card in full" style="padding:8px 14px 12px"><div class="between" style="height:36px"><span class="small muted">' + rows.length + ' รายการ</span><span style="font-weight:700;color:' + (sum < 0 ? 'var(--pinkD)' : 'var(--skyD)') + '">' + (sum < 0 ? '-' : '+') + '฿' + money(Math.abs(sum)) + '</span></div>';
  if (!rows.length) h += '<div class="empty">ไม่มีรายการ</div>';
  var last = '';
  rows.forEach(function(t){ if (t.date !== last) { last = t.date; h += '<div class="day">' + esc(dayLabel(t.date)) + '</div>'; } h += txRow(t); });
  h += '</div><button type="button" class="btn primary press in full" data-act="new">+ จดรายการใหม่</button>';
  return h;
}

/* ---------- หน้า ตั้งค่า ---------- */
function renderSettings(){
  var d = S.d, h = '<div class="in"><div class="small muted">จดให้</div><h1 style="font-size:24px">ตั้งค่า</h1></div>';
  h += '<div class="card in small" style="color:var(--ink2);line-height:1.6">📨 ข้อความที่บอททักไปเดือนนี้ <b>' + (d.quota || 0) + ' / 300</b> (ฟรี)<div class="track" style="margin-top:6px"><div class="fill" style="width:' + Math.min(100, (d.quota || 0) / 3).toFixed(1) + '%;background:' + ((d.quota || 0) > 250 ? '#E5484D' : 'var(--mint)') + '"></div></div>การตอบกลับตอนคุณส่งสลิปหรือพิมพ์ ไม่นับโควตา · ถ้าใกล้ 280 จะหยุดเตือนจดรายวันให้เอง</div>';
  h += '<div class="card in"><label class="between" for="remind" style="min-height:44px;font-size:14px"><span>🔔 เตือนใน LINE ตอน 3 ทุ่ม ถ้าวันนั้นยังไม่ได้จด</span><input id="remind" type="checkbox" data-act="remind" ' + (d.remind ? 'checked' : '') + ' style="width:22px;height:22px;accent-color:var(--lav)"></label></div>';
  h += '<div class="card in" style="display:flex;flex-direction:column;gap:8px;animation-delay:.05s"><h2 style="font-size:17px">งบรายเดือนแต่ละหมวด</h2><div class="small muted">ใส่ 0 หรือเว้นว่าง ถ้าไม่ต้องการตั้งงบหมวดนั้น</div>';
  d.expenseCats.forEach(function(c, i){
    var spent = d.exp[c] || 0, b = d.budgets[c] || 0;
    h += '<div style="display:grid;grid-template-columns:1fr 120px;gap:8px;align-items:center"><div><div style="font-size:14px">' + emo(c) + ' ' + esc(c) + '</div>' + (b ? '<div class="track" style="height:6px;margin-top:4px"><div class="fill" style="height:6px;width:' + Math.min(100, Math.max(2, spent / b * 100)).toFixed(1) + '%;background:' + (spent > b ? '#E5484D' : CAT_COLORS[i]) + '"></div></div><div style="font-size:11px" class="muted">ใช้ไป ฿' + money(spent) + '</div>' : '') + '</div>' +
      '<input class="inp" inputmode="decimal" data-budget="' + esc(c) + '" aria-label="งบหมวด ' + esc(c) + '" placeholder="ไม่ตั้ง" value="' + (b ? b : '') + '"></div>';
  });
  h += '<button type="button" class="btn primary press" data-act="savebudget">บันทึกงบ</button></div>';
  h += '<div class="card in" style="font-size:13px;line-height:1.7;color:var(--ink2);animation-delay:.1s"><h2 style="font-size:17px;color:var(--ink)">คำสั่งใน LINE</h2>📷 ส่งรูปสลิป → จดให้อัตโนมัติ<br>✏️ ข้าวมันไก่ 60 / เงินเดือน 15000<br>📊 สรุป · สรุปเดือนก่อน · วันนี้<br>💰 งบ · งบ อาหาร 3000<br>💳 หนี้ · 👛 กระเป๋า<br>⇄ โยก 2000 เงินเดือน ไป เก็บเงิน<br>💳 รูด 459 ชาบู (ลงบัตรเครดิต)<br>🤝 ให้ยืม มิ้นท์ 500 · ยืม แม่ 2000 · คืน มิ้นท์ 500<br>🔔 เตือน เปิด / เตือน ปิด<br>🗑️ ลบข้อมูลของฉัน</div>';
  return h;
}

/* ---------- แก้ไข/เพิ่มรายการ ---------- */
function openEdit(t){
  var d = S.d;
  S.sheetMode = t && (t.type === 'โยกเงิน' || t.type === 'ยืมคืน') ? 'info' : 'tx';
  var dw = (d.wallets || []).filter(function(w){ return w.isDefault; })[0];
  S.edit = t ? JSON.parse(JSON.stringify(t)) : { id: '', type: 'รายจ่าย', amount: '', category: 'อาหาร', payee: '', date: d.today, time: d.now, note: '', wallet: dw ? dw.id : '' };
  S.edit.remember = true;
  S.edit.note = editNote(S.edit.note);
  drawSheet();
  $('sheetBg').classList.add('open');
}
function closeEdit(){ $('sheetBg').classList.remove('open'); S.edit = null; S.mv = null; S.wf = null; S.pay = null; S.sheetMode = 'tx'; }
function drawSheet(){
  if (S.sheetMode === 'wallet') return drawWalletSheet();
  if (S.sheetMode === 'move') return drawMoveSheet();
  if (S.sheetMode === 'info') return drawInfoSheet();
  if (S.sheetMode === 'pay') return drawPaySheet();
  var e = S.edit, d = S.d, isExp = e.type === 'รายจ่าย', cats = isExp ? d.expenseCats : d.incomeCats;
  var h = '<div class="between"><h2 id="sheetTitle" style="font-size:18px">' + (e.id ? 'แก้ไขรายการ' : 'จดรายการใหม่') + '</h2><button type="button" class="icon-btn press" data-act="close" aria-label="ปิด"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>';
  h += '<div class="seg2"><button type="button" class="' + (isExp ? 'on' : '') + '" data-act="settype" data-v="รายจ่าย">รายจ่าย</button><button type="button" class="' + (!isExp ? 'on' : '') + '" data-act="settype" data-v="รายรับ">รายรับ</button></div>';
  h += '<label class="f" for="fAmount">จำนวนเงิน (บาท)<input class="inp big" id="fAmount" inputmode="decimal" style="height:56px;font-size:26px;color:' + (isExp ? 'var(--pinkD)' : 'var(--skyD)') + '" value="' + esc(e.amount) + '" placeholder="0"></label>';
  h += '<div class="f" style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:var(--ink2)">หมวดหมู่<div class="chips" style="grid-template-columns:repeat(3,minmax(0,1fr))">';
  cats.forEach(function(c){ h += '<button type="button" class="chip press' + (c === e.category ? ' on' : '') + '" aria-pressed="' + (c === e.category) + '" data-act="setcat" data-v="' + esc(c) + '">' + emo(c) + ' ' + esc(c) + '</button>'; });
  h += '</div></div>';
  var wls = (d.wallets || []).filter(function(w){ return isExp || w.kind !== 'บัตรเครดิต'; });
  if (wls.length) h += '<div class="f" style="display:flex;flex-direction:column;gap:6px;font-size:13px;font-weight:500;color:var(--ink2)">' + (isExp ? 'จ่ายจากกระเป๋า' : 'เข้ากระเป๋า') + '<div class="chips" style="grid-template-columns:repeat(2,minmax(0,1fr))">' +
    wls.concat([{ id: '', name: 'ไม่ระบุ', kind: '' }]).map(function(w){ var on = (e.wallet || '') === w.id; return '<button type="button" class="chip press' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="setwal" data-v="' + esc(w.id) + '" style="font-size:12px">' + (KIND_EMO[w.kind] || '') + ' ' + esc(w.name) + '</button>'; }).join('') + '</div></div>';
  h += '<label class="f" for="fPayee">' + (isExp ? 'ผู้รับ / ร้าน' : 'ได้จาก') + '<input class="inp" id="fPayee" maxlength="80" value="' + esc(e.payee) + '"></label>';
  h += '<div class="grid2"><label class="f" for="fDate">วันที่<input class="inp" type="date" id="fDate" value="' + esc(e.date) + '"></label><label class="f" for="fTime">เวลา<input class="inp" type="time" id="fTime" value="' + esc(e.time) + '"></label></div>';
  h += '<label class="f" for="fNote">โน้ต (ไม่บังคับ)<input class="inp" id="fNote" maxlength="200" placeholder="เช่น เลี้ยงข้าวเพื่อน" value="' + esc(e.note) + '"></label>';
  h += '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px">' + (e.id ? '<button type="button" class="btn danger press" data-act="delcur">ลบ</button>' : '<button type="button" class="btn ghost press" data-act="close">ยกเลิก</button>') + '<button type="submit" class="btn primary press">บันทึก</button></div>';
  $('sheet').innerHTML = h;
}
function grab(){
  var e = S.edit; if (!e) return;
  e.amount = $('fAmount').value; e.payee = $('fPayee').value; e.date = $('fDate').value; e.time = $('fTime').value; e.note = $('fNote').value;
  var r = $('fRemember'); if (r) e.remember = r.checked;
}
function saveEdit(ev){
  ev.preventDefault(); if (S.busy) return;
  if (S.sheetMode === 'wallet') return saveWallet();
  if (S.sheetMode === 'move') return doMove();
  if (S.sheetMode === 'info') return;
  if (S.sheetMode === 'pay') return doPay();
  grab();
  var e = S.edit, amt = num(e.amount);
  if (!(amt > 0)) { toast('ใส่จำนวนเงินก่อนนะ'); return; }
  S.busy = true;
  run('apiSaveTx', TOKEN, { id: e.id, type: e.type, amount: amt, category: e.category, payee: e.payee, date: e.date, time: e.time, note: e.note, remember: !!e.remember, wallet: e.wallet || '' })
    .then(function(){ S.busy = false; var ym = e.date.slice(0, 7); closeEdit(); toast('บันทึกแล้ว ✓'); load(ym); }).catch(fail);
}
function delTx(id){
  var t = S.d.tx.filter(function(x){ return x.id === id; })[0];
  if (!t || S.busy) return;
  if (!confirm('ลบ "' + t.payee + '" ' + money(t.amount) + ' บาท ใช่ไหม')) return;
  S.busy = true;
  run('apiDeleteTx', TOKEN, id).then(function(){ S.busy = false; closeEdit(); toast('ลบแล้ว'); reload(); }).catch(fail);
}

/* ---------- จัดการการกด ---------- */
document.addEventListener('click', function(ev){
  var el = ev.target.closest('[data-act]'); if (!el) return;
  var a = el.getAttribute('data-act'), d = S.d;
  if (a === 'remind') return;
  if (a === 'tab') { S.tab = +el.getAttribute('data-i'); S.animate = true; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (a === 'month') { $('view').innerHTML = '<div class="loading">กำลังโหลด...</div>'; load(shiftYm(d.ym, +el.getAttribute('data-k'))); return; }
  if (a === 'char') {
    S.taps++; S.phrase++;
    var f = $('charFrame'), hrt = $('heart'), b = $('bubble'), ph = PHRASES[d.level.lv] || PHRASES[3];
    f.style.animation = 'none'; hrt.style.animation = 'none'; b.style.animation = 'none'; void f.offsetWidth;
    f.style.animation = 'bA .6s cubic-bezier(.34,1.56,.64,1)'; hrt.style.animation = 'heart .9s ease-out both'; b.style.animation = 'pop .35s cubic-bezier(.34,1.56,.64,1)';
    b.textContent = ph[S.phrase % ph.length];
    return;
  }
  if (a === 'seg') { var i = +el.getAttribute('data-i'); S.sel = S.sel === i ? -1 : i; render(); return; }
  if (a === 'week') { S.week = +el.getAttribute('data-i'); S.bar = -1; S.animate = true; render(); return; }
  if (a === 'bar') { var j = +el.getAttribute('data-i'); S.bar = S.bar === j ? -1 : j; render(); return; }
  if (a === 'open') { var t = d.tx.filter(function(x){ return x.id === el.getAttribute('data-id'); })[0]; if (t) openEdit(t); return; }
  if (a === 'deltx') { delTx(el.getAttribute('data-id')); return; }
  if (a === 'new') { openEdit(null); return; }
  if (a === 'duef') { S.dueF = el.getAttribute('data-v'); render(); return; }
  if (a === 'duesel') { S.dueSel = el.getAttribute('data-k'); S.tab = 8; S.animate = true; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (a === 'payopen') { openPay(el.getAttribute('data-k')); return; }
  if (a === 'payq') { $('payAmt').value = el.getAttribute('data-v'); S.pay.amount = el.getAttribute('data-v'); return; }
  if (a === 'paywal') { S.pay.amount = $('payAmt').value; S.pay.date = $('payDate').value; S.pay.wallet = el.getAttribute('data-id'); drawPaySheet(); return; }
  if (a === 'histtx') { closeEdit(); load('', el.getAttribute('data-id')); return; }
  if (a === 'dueedit') {
    var dx = dueItem(el.getAttribute('data-k')); if (!dx) return;
    if (dx.kind === 'debt') { var dd0 = d.debts.filter(function(y){ return y.id === dx.id; })[0]; if (dd0) S.debtEdit = { id: dd0.id, name: dd0.name, balance: dd0.balance, rate: dd0.rate, min: dd0.min, due: dd0.due }; S.tab = 7; render(); setTimeout(function(){ var n = $('dn'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); return; }
    if (dx.kind === 'bill') { var be0 = (d.bills || []).filter(function(y){ return y.id === dx.id; })[0]; if (be0) S.billEdit = { id: be0.id, name: be0.name, emoji: be0.emoji, amount: be0.amount, fixed: be0.fixed, due: be0.due, auto: be0.auto, wallet: be0.wallet, cat: be0.cat }; S.tab = 11; render(); setTimeout(function(){ var n = $('bName'); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); return; }
    var wc = (d.wallets || []).filter(function(y){ return y.id === dx.id; })[0]; if (wc) openWalletSheet(wc); return;
  }
  if (a === 'close') { closeEdit(); return; }
  if (a === 'delcur') { if (S.edit && S.edit.id) delTx(S.edit.id); return; }
  if (a === 'settype') { grab(); var v = el.getAttribute('data-v'); if (S.edit.type !== v) { S.edit.type = v; S.edit.category = v === 'รายจ่าย' ? 'อาหาร' : 'เงินเดือน'; } drawSheet(); return; }
  if (a === 'setcat') { grab(); S.edit.category = el.getAttribute('data-v'); drawSheet(); return; }
  if (a === 'filter') { S.filter = el.getAttribute('data-c'); render(); return; }
  if (a === 'setwal') { grab(); S.edit.wallet = el.getAttribute('data-v'); drawSheet(); return; }
  if (a === 'wopen') { var wid = el.getAttribute('data-id'); S.wOpen = S.wOpen === wid ? '' : wid; render(); return; }
  if (a === 'wadd') { openWalletSheet(null); return; }
  if (a === 'wedit') { var we = (d.wallets || []).filter(function(y){ return y.id === el.getAttribute('data-id'); })[0]; if (we) openWalletSheet(we); return; }
  if (a === 'wkind') { grabWallet(); S.wf.kind = el.getAttribute('data-v'); if (S.wf.kind === 'เงินสด') S.wf.bank = 'เงินสด'; else if (S.wf.bank === 'เงินสด') S.wf.bank = S.wf.kind === 'อีวอลเล็ต' ? 'ทรูมันนี่' : 'กสิกรไทย'; if (S.wf.kind === 'อีวอลเล็ต' && d.providers.indexOf(S.wf.bank) < 0) S.wf.bank = 'ทรูมันนี่'; if (S.wf.kind !== 'อีวอลเล็ต' && d.providers.indexOf(S.wf.bank) >= 0) S.wf.bank = 'กสิกรไทย'; drawSheet(); return; }
  if (a === 'wbank') { grabWallet(); S.wf.bank = el.getAttribute('data-v'); drawSheet(); return; }
  if (a === 'wdel') {
    var wd = (d.wallets || []).filter(function(y){ return y.id === el.getAttribute('data-id'); })[0];
    if (!wd || S.busy || !confirm('ลบกระเป๋า "' + wd.name + '" ใช่ไหม (รายการที่จดไว้ไม่หาย แต่จะไม่ผูกกับกระเป๋านี้แล้ว)')) return;
    S.busy = true;
    run('apiDeleteWallet', TOKEN, wd.id).then(function(list){ S.busy = false; d.wallets = list; S.wOpen = ''; render(); toast('ลบแล้ว'); }).catch(fail);
    return;
  }
  if (a === 'recon') {
    var rid = el.getAttribute('data-id'), rv = num($('rc_' + rid).value);
    if (!isFinite(rv) || $('rc_' + rid).value.trim() === '') return toast('ใส่ยอดจริงก่อนนะ');
    if (S.busy) return; S.busy = true;
    run('apiReconcile', TOKEN, rid, rv).then(function(r){ S.busy = false; toast(r.diff === 0 ? 'ยอดตรงกันเป๊ะ เก่งมาก 🎉' : 'ปรับยอดแล้ว ส่วนต่าง ฿' + money(Math.abs(r.diff))); reload(); }).catch(fail);
    return;
  }
  if (a === 'mvopen') { var ws0 = (d.wallets || []).filter(function(w){ return w.kind !== 'บัตรเครดิต'; }); S.mv = { from: ws0[0] ? ws0[0].id : '', to: '', amount: '' }; var t0 = (d.wallets || []).filter(function(w){ return w.id !== S.mv.from; })[0]; S.mv.to = t0 ? t0.id : ''; S.sheetMode = 'move'; drawSheet(); $('sheetBg').classList.add('open'); return; }
  if (a === 'mvfrom' || a === 'mvto') { var am = $('mvAmt'); if (am) S.mv.amount = am.value; var vid = el.getAttribute('data-id'); if (a === 'mvfrom') { S.mv.from = vid; if (S.mv.to === vid) S.mv.to = ''; } else if (vid !== S.mv.from) S.mv.to = vid; drawSheet(); return; }
  if (a === 'loandir') { S.loanDir = el.getAttribute('data-v'); render(); return; }
  if (a === 'loanadd') {
    var lw = $('lnWho').value.trim(), la = num($('lnAmt').value);
    if (!lw) return toast('ใส่ชื่อคนก่อนนะ'); if (!(la > 0)) return toast('ใส่จำนวนเงิน');
    if (S.busy) return; S.busy = true;
    run('apiAddLoan', TOKEN, { who: lw, amount: la, dir: S.loanDir }).then(function(){ S.busy = false; toast('จดแล้ว 🤝'); reload(); }).catch(fail);
    return;
  }
  if (a === 'loanclose') {
    var lx = (d.loans || []).filter(function(y){ return y.id === el.getAttribute('data-id'); })[0];
    if (!lx || S.busy || !confirm((lx.dir === 'ให้ยืม' ? lx.who + ' คืนเงินเรา' : 'เราคืนเงิน ' + lx.who) + ' ฿' + money(lx.left) + ' ครบแล้ว ใช่ไหม')) return;
    S.busy = true;
    run('apiSettleLoan', TOKEN, lx.id).then(function(){ S.busy = false; toast('ปิดรายการแล้ว ✓'); reload(); }).catch(fail);
    return;
  }
  if (a === 'salsave') { if (S.busy) return; var sa = num($('salAmt').value), sd = num($('salDay').value); if (!(sa >= 0)) return toast('ใส่เงินเดือนให้ถูกต้อง'); S.busy = true; run('apiSetSalary', TOKEN, sa, sd || 0).then(function(){ S.busy = false; d.salary = sa; d.payday = sd || 0; render(); toast('บันทึกแล้ว ✓'); }).catch(fail); return; }
  if (a === 'bfixed') { grabBill(); S.billEdit.fixed = el.getAttribute('data-v') === '1'; render(); return; }
  if (a === 'bauto') { var ba = grabBill(); ba.auto = el.getAttribute('data-v') === '1'; if (ba.auto) ba.fixed = true; if (ba.auto && !ba.wallet) { var dw = (d.wallets || []).filter(function(w){ return w.isDefault; })[0]; ba.wallet = dw ? dw.id : ''; } if (!ba.cat) ba.cat = 'บันเทิง'; render(); return; }
  if (a === 'billedit') { var be = (d.bills || []).filter(function(y){ return y.id === el.getAttribute('data-id'); })[0]; if (be) { S.billEdit = { id: be.id, name: be.name, emoji: be.emoji, amount: be.amount, fixed: be.fixed, due: be.due, auto: be.auto, wallet: be.wallet, cat: be.cat }; render(); setTimeout(function(){ $('bName').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); } return; }
  if (a === 'billsave') { if (S.busy) return; var bf = grabBill(); if (!bf.name.trim()) return toast('ใส่ชื่อรายการก่อนนะ'); if (!(num(bf.amount) >= 0)) return toast('ใส่ยอดเงิน'); S.busy = true;
    run('apiSaveBill', TOKEN, { id: bf.id, name: bf.name, emoji: bf.emoji, amount: num(bf.amount), fixed: !!bf.fixed, due: num(bf.due) || 1, auto: !!bf.auto, wallet: bf.wallet || '', cat: bf.cat || '' }).then(function(list){ S.busy = false; d.bills = list; S.billEdit = null; render(); toast('บันทึกแล้ว ✓'); }).catch(fail); return; }
  if (a === 'billdel') { var bd = (d.bills || []).filter(function(y){ return y.id === el.getAttribute('data-id'); })[0]; if (!bd || S.busy || !confirm('ลบ "' + bd.name + '" ใช่ไหม')) return; S.busy = true; run('apiDeleteBill', TOKEN, bd.id).then(function(list){ S.busy = false; d.bills = list; S.billEdit = null; render(); toast('ลบแล้ว'); }).catch(fail); return; }
  if (a === 'billmark') { if (S.busy) return; S.busy = true; run('apiMarkBill', TOKEN, el.getAttribute('data-id'), el.getAttribute('data-v') === '1').then(function(list){ S.busy = false; d.bills = list; render(); }).catch(fail); return; }
  if (a === 'dsel') { S.dsel = +el.getAttribute('data-i'); render(); return; }
  if (a === 'dx') { S.dx = +el.getAttribute('data-v'); render(); return; }

  if (a === 'extra') { S.extra = +el.getAttribute('data-v'); render(); return; }
  if (a === 'monthly') { S.monthly = +el.getAttribute('data-v'); render(); return; }
  if (a === 'rate') { S.rate = +el.getAttribute('data-v'); render(); return; }
  if (a === 'editdebt') { var x = d.debts.filter(function(y){ return y.id === el.getAttribute('data-id'); })[0]; if (x) { S.debtEdit = { id: x.id, name: x.name, balance: x.balance, rate: x.rate, min: x.min, due: x.due }; render(); setTimeout(function(){ $('dn').focus(); $('dn').scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 50); } return; }
  if (a === 'canceldebt') { S.debtEdit = null; render(); return; }
  if (a === 'savedebt') {
    if (S.busy) return;
    var body = { id: S.debtEdit ? S.debtEdit.id : '', name: $('dn').value.trim(), balance: num($('db').value), rate: $('dr').value.trim() === '' ? 0 : num($('dr').value), min: num($('dm').value), due: $('dd').value.trim() === '' ? 1 : num($('dd').value) };
    if (!body.name) return toast('ใส่ชื่อหนี้ก่อนนะ');
    if (!(body.balance >= 0)) return toast('ใส่ยอดคงเหลือให้ถูกต้อง');
    if (!(body.min > 0)) return toast('ใส่ยอดจ่ายขั้นต่ำต่อเดือน');
    S.busy = true;
    run('apiSaveDebt', TOKEN, body).then(function(list){ S.busy = false; d.debts = list; S.debtEdit = null; render(); toast('บันทึกหนี้แล้ว ✓'); }).catch(fail);
    return;
  }
  if (a === 'deldebt') {
    var dx = d.debts.filter(function(y){ return y.id === el.getAttribute('data-id'); })[0];
    if (!dx || S.busy || !confirm('ลบหนี้ "' + dx.name + '" ใช่ไหม')) return;
    S.busy = true;
    run('apiDeleteDebt', TOKEN, dx.id).then(function(list){ S.busy = false; d.debts = list; render(); toast('ลบแล้ว'); }).catch(fail);
    return;
  }
  if (a === 'addgoal') {
    if (S.busy) return;
    var g = { name: $('gn').value.trim(), target: num($('gt').value), months: $('gm').value.trim() === '' ? 12 : num($('gm').value), saved: 0 };
    if (!g.name) return toast('ใส่ชื่อเป้าหมายก่อนนะ');
    if (!(g.target > 0)) return toast('ใส่ยอดเงินเป้าหมาย');
    if (!(g.months >= 1 && g.months <= 600)) return toast('จำนวนเดือนต้องอยู่ระหว่าง 1–600');
    S.busy = true;
    run('apiSaveGoal', TOKEN, g).then(function(list){ S.busy = false; d.goals = list; render(); toast('เพิ่มเป้าหมายแล้ว 🎯'); }).catch(fail);
    return;
  }
  if (a === 'gadd' || a === 'eadd') {
    if (S.busy) return;
    var isE = a === 'eadd', inp = isE ? $('eAdd') : $('ga_' + el.getAttribute('data-id')), add = num(inp.value);
    if (!(add > 0)) return toast('ใส่จำนวนเงินที่จะเพิ่ม');
    var cur = isE ? (d.goals.filter(function(y){ return y.id === 'EMERGENCY'; })[0] || { id: 'EMERGENCY', name: 'เงินสำรองฉุกเฉิน', target: Math.max(1, Math.round((d.avgExpense || d.expense || 1) * 3)), saved: 0, months: 12 }) : d.goals.filter(function(y){ return y.id === el.getAttribute('data-id'); })[0];
    if (!cur) return;
    S.busy = true;
    run('apiSaveGoal', TOKEN, { id: cur.id, name: cur.name, target: isE ? Math.max(1, Math.round((d.avgExpense || d.expense || 1) * 3)) : cur.target, saved: cur.saved + add, months: cur.months })
      .then(function(list){ S.busy = false; d.goals = list; render(); toast('เพิ่ม ฿' + money(add) + ' แล้ว ✨'); }).catch(fail);
    return;
  }
  if (a === 'delgoal') {
    var gx = d.goals.filter(function(y){ return y.id === el.getAttribute('data-id'); })[0];
    if (!gx || S.busy || !confirm('ลบเป้าหมาย "' + gx.name + '" ใช่ไหม')) return;
    S.busy = true;
    run('apiDeleteGoal', TOKEN, gx.id).then(function(list){ S.busy = false; d.goals = list; render(); toast('ลบแล้ว'); }).catch(fail);
    return;
  }
  if (a === 'savebudget') {
    if (S.busy) return;
    var map = {};
    Array.prototype.forEach.call(document.querySelectorAll('[data-budget]'), function(inp){ var v = num(inp.value); map[inp.getAttribute('data-budget')] = v > 0 ? v : 0; });
    S.busy = true;
    run('apiSetBudgets', TOKEN, map).then(function(b){ S.busy = false; d.budgets = b; render(); toast('บันทึกงบแล้ว ✓'); }).catch(fail);
    return;
  }
});
document.addEventListener('change', function(ev){
  if (ev.target.id === 'remind') {
    var on = ev.target.checked;
    run('apiSetRemind', TOKEN, on).then(function(){ S.d.remind = on; toast(on ? 'เปิดการเตือนแล้ว 🔔' : 'ปิดการเตือนแล้ว'); }).catch(fail);
  }
});
$('sheet').addEventListener('submit', saveEdit);
$('sheetBg').addEventListener('click', function(ev){ if (ev.target === this) closeEdit(); });

JDAPI.onReady(function(){ load('', EDIT_ID); });
