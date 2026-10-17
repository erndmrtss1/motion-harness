// lib/qc-img.mjs — QC görüntü ölçüleri (kaynak qc / probe-contrast ile birebir aynı yöntem; sayılar değişmesin diye ayrıntı korunur).
//   Ölçüm uzayı: 960×540 luma (blur 0.8, cubic; Rec.709 katsayıları 8-bit gamma uzayında) → 480×270 (2×2 ortalama).
export const W2 = 960, H2 = 540;

// 960×540 luma → 480×270 (2×2 ortalama)
export function lum480(y) {
  const w = W2 / 2, h = H2 / 2, o = new Float32Array(w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const k = 2 * yy * W2 + 2 * xx; o[yy * w + xx] = (y[k] + y[k + 1] + y[k + W2] + y[k + W2 + 1]) / 4; }
  return o;
}

// §5a okunurluk kontrastı (1.4.1): kahraman maskesinin ortalama luması − çevre halkasının (maske kutusu R px [480 ölçeği] genişletilmiş, maske hariç) luması
export function heroContrast(L, mask, R = 30) {
  const w = W2 / 2, h = H2 / 2; let x0 = w, y0 = h, x1 = -1, y1 = -1, hs = 0, hn = 0;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) if (mask[yy * w + xx]) { hs += L[yy * w + xx]; hn++; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
  if (!hn) return null;
  const X0 = Math.max(0, x0 - R), X1 = Math.min(w - 1, x1 + R), Y0 = Math.max(0, y0 - R), Y1 = Math.min(h - 1, y1 + R); let rs = 0, rn = 0;
  for (let yy = Y0; yy <= Y1; yy++) for (let xx = X0; xx <= X1; xx++) if (!mask[yy * w + xx]) { rs += L[yy * w + xx]; rn++; }
  const hero = hs / hn, ring = rn ? rs / rn : 0;
  return { hero: +hero.toFixed(1), ring: +ring.toFixed(1), diff: +(hero - ring).toFixed(1) };
}

// 3×3 genişletme (dil) / aşındırma (!dil), w×h ikili maske; kenar dışı 0
export function morph3(src, w, h, dil) {
  const o = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { let a = dil ? 0 : 1;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = xx + dx, Yy = yy + dy;
      const q = X < 0 || Yy < 0 || X >= w || Yy >= h ? 0 : src[Yy * w + X]; if (dil && q) a = 1; if (!dil && !q) a = 0; }
    o[yy * w + xx] = a; }
  return o;
}

// §5a kadraj: en büyük bağlı parlak bölge (480×270; luma > thr; 3×3 kapanış metin deliklerini kapatır; 8-komşu)
export function heroRegion(y, thr = 77) {
  const w = W2 / 2, h = H2 / 2, m = new Uint8Array(w * h), L = lum480(y);
  for (let i = 0; i < w * h; i++) m[i] = L[i] > thr ? 1 : 0;
  const c = morph3(morph3(m, w, h, true), w, h, false), seen = new Int32Array(w * h), st = [];
  let best = { n: 0, y0: 0, y1: -1, x0: 0, x1: -1, id: 0 }, cid = 0;
  for (let i = 0; i < w * h; i++) {
    if (!c[i] || seen[i]) continue;
    let n = 0, y0 = h, y1 = 0, x0 = w, x1 = 0; cid++; seen[i] = cid; st.push(i);
    while (st.length) { const p = st.pop(), px = p % w, py = (p - px) / w; n++;
      if (py < y0) y0 = py; if (py > y1) y1 = py; if (px < x0) x0 = px; if (px > x1) x1 = px;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = px + dx, Yy = py + dy;
        if (X < 0 || Yy < 0 || X >= w || Yy >= h) continue; const q = Yy * w + X; if (c[q] && !seen[q]) { seen[q] = cid; st.push(q); } } }
    if (n > best.n) best = { n, y0, y1, x0, x1, id: cid };
  }
  const hm = new Uint8Array(w * h); if (best.id) for (let i = 0; i < w * h; i++) hm[i] = seen[i] === best.id ? 1 : 0;
  return { area: +(best.n / (w * h)).toFixed(3), height: +((best.y1 - best.y0 + 1) / h).toFixed(3), box: [best.x0 * 4, best.y0 * 4, (best.x1 + 1) * 4, (best.y1 + 1) * 4], contrast: heroContrast(L, hm) };
}

// DOM kahraman ızgarası (192×108, 10 px; '0'/'1' dizgisi) → 480×270 maske
export function gridMask(grid) {
  const w = W2 / 2, h = H2 / 2, hm = new Uint8Array(w * h);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) hm[yy * w + xx] = grid.charCodeAt(Math.floor(yy / 2.5) * 192 + Math.floor(xx / 2.5)) === 49 ? 1 : 0;
  return hm;
}

// WCAG göreli parlaklık (sRGB)
export const relL = (r, g, b) => { const c = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b); };

// Metin kutusunun WCAG oranı (zemin = medyan; mürekkep = medyandan uca giden yolun yarısını aşan piksellerin %90 dilimi;
// yön DOM metin rengi opaksa ondan, yoksa medyan sezgisi). data: RGB ham tampon, width: genişlik. Kutu < 4 px → null.
export function textRatio(data, width, height, row) {
  const x0 = Math.max(0, row[2]), y0 = Math.max(0, row[3]), x1 = Math.min(width, row[2] + row[4]), y1 = Math.min(height, row[3] + row[5]);
  if (x1 - x0 < 4 || y1 - y0 < 4) return null;
  const v = []; for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const k = (yy * width + xx) * 3; v.push(relL(data[k], data[k + 1], data[k + 2])); }
  v.sort((a, b) => a - b); const med = v[Math.floor(v.length / 2)], lo = v[Math.floor(v.length * 0.01)], hi = v[Math.floor(v.length * 0.99)];
  const cm = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(row[7] || ''), cL = cm && (cm[4] == null || +cm[4] >= 0.5) ? relL(+cm[1], +cm[2], +cm[3]) : null;
  const up = cL != null ? cL > med : hi - med >= med - lo, th = up ? med + 0.5 * (hi - med) : med - 0.5 * (med - lo), ink = up ? v.filter((x) => x >= th) : v.filter((x) => x <= th);
  const tl = ink.length ? ink[Math.floor((up ? 0.9 : 0.1) * (ink.length - 1))] : med;
  return (Math.max(tl, med) + 0.05) / (Math.min(tl, med) + 0.05);
}

// Sayfa içi ölçü betiği parçaları (qc metin/kadraj ve k1 contrast aynı tanımı kullanır).
// painted(): örtücü öğe — opak yüz ya da üstte başka metin (yarı saydam parlama/doku katmanı örtmez; dolgu alfası da sayılır)
export const JS_PAINTED = `function painted(h){ if(h.nodeType!==1) return false; var tg=h.tagName; if(tg==='IMG'||tg==='CANVAS'||tg==='VIDEO') return true;
 var c3=getComputedStyle(h); if(+c3.opacity<0.85||c3.visibility==='hidden'||c3.mixBlendMode!=='normal') return false;
 for(var cn=h.firstChild;cn;cn=cn.nextSibling){ if(cn.nodeType===3&&cn.nodeValue.trim()) return true; }
 if(h instanceof SVGElement){ var fa=c3.fill.indexOf('rgba(')===0?+c3.fill.slice(c3.fill.lastIndexOf(',')+1,-1):1;
  return ['svg','g','defs','filter','clipPath','mask','text','tspan'].indexOf(tg)<0&&c3.fill!=='none'&&fa*(+c3.fillOpacity)>=0.85; }
 var bi=c3.backgroundImage; if(bi!=='none'&&bi.indexOf('rgba(')<0&&bi.indexOf('transparent')<0) return true;
 var bg3=c3.backgroundColor; if(bg3.indexOf('rgb(')===0) return true; if(bg3.indexOf('rgba(')===0) return +bg3.slice(bg3.lastIndexOf(',')+1,-1)>=0.85; return false; }`;
// görünür metin satırları → rows [metin, ekran px, x, y, w, h, görünür pay, renk]; tek karakter yalnız ≥ 72 px ölçülür; [data-doku] hariç
export const jsTextRows = (cut) => `var rows=[], w2=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null), n2;
 while(n2=w2.nextNode()){ var t2=(n2.nodeValue||'').trim(); var an2=t2.replace(/[^A-Za-z0-9\\u00C0-\\u024F]/g,'').length; if(!t2) continue;
  var e2=n2.parentElement; if(!e2||e2.closest('[data-doku],script,style,title,head')) continue; var s2=getComputedStyle(e2);
  if(s2.display==='none'||s2.visibility==='hidden') continue; var op=1; for(var a2=e2;a2&&a2.nodeType===1;a2=a2.parentElement){ op*=+getComputedStyle(a2).opacity; } if(op<0.15) continue;
  var rc=e2.getBoundingClientRect(); if(rc.width<1||rc.height<1||rc.right<=0||rc.bottom<=0||rc.left>=innerWidth||rc.top>=innerHeight) continue;
  var sc=1; if(e2 instanceof SVGGraphicsElement){ var bb=e2.getBBox(); sc=bb.height>0?rc.height/bb.height:1; } else { var oh=e2.offsetHeight; sc=oh>0?rc.height/oh:1; }
  if(an2<2&&parseFloat(s2.fontSize)*sc<72) continue;
  var rg=document.createRange(); rg.selectNodeContents(n2); var rb=rg.getBoundingClientRect(); if(rb.width<1||rb.height<1) rb=rc;
  var vis=0, tot=0; for(var gy=0;gy<3;gy++){ for(var gx=0;gx<5;gx++){ var px=rb.left+rb.width*(0.15+0.175*gx), py=rb.top+rb.height*(0.25+0.25*gy); if(px<0||py<0||px>=innerWidth||py>=innerHeight) continue; tot++;
   if(s2.pointerEvents==='none'){ vis++; continue; } var hl=document.elementsFromPoint(px,py), okh=false;
   for(var q3=0;q3<hl.length;q3++){ var h3=hl[q3]; if(h3===e2||e2.contains(h3)){ okh=true; break; } if(h3.contains(e2)) continue; if(painted(h3)) break; }
   if(okh) vis++; } }
  rows.push([t2.slice(0,${cut}), +(parseFloat(s2.fontSize)*sc).toFixed(1), Math.round(rb.left), Math.round(rb.top), Math.round(rb.width), Math.round(rb.height), tot?+(vis/tot).toFixed(2):1, s2.color]); }`;
// [data-hero] (seçici world.k1.selector) ızgarası 192×108 (10 px): hg, hy0, hy1 değişkenleri
export const jsHeroGrid = (sel) => `var hg=new Uint8Array(192*108), hy0=108, hy1=-1; document.querySelectorAll(${JSON.stringify(sel || '[data-hero]')}).forEach(function(h){ var r=h.getBoundingClientRect(); if(r.width<1||r.height<1) return;
  var x0=Math.max(0,Math.floor(r.left/10)), x1=Math.min(191,Math.floor((r.right-1)/10)), y0=Math.max(0,Math.floor(r.top/10)), y1=Math.min(107,Math.floor((r.bottom-1)/10));
  for(var yy=y0;yy<=y1;yy++){ for(var xx=x0;xx<=x1;xx++) hg[yy*192+xx]=1; } if(y1>=y0){ hy0=Math.min(hy0,y0); hy1=Math.max(hy1,y1); } });`;
