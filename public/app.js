const analyticsId = 'G-HZRLCDXY6P';
const vercelProductionOrigin = document.querySelector('meta[name="renmotor-production-origin"]')?.content;
const analyticsEnabled = window.location.origin === 'https://renmotor-tw.github.io' ||
  window.location.origin === vercelProductionOrigin;
if (analyticsEnabled) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', analyticsId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsId}`;
  document.head.appendChild(tag);
}

function trackVehicleEvent(event, bike) {
  if (!analyticsEnabled) return;
  window.gtag('event', event, {
    send_to: analyticsId,
    vehicle_stock_number: bike.stock_number,
    vehicle_model: bike.model.slice(0, 100),
    vehicle_store: bike.store
  });
}

const PAGE_SIZE = 50;
let bikes = [];
let currentPage = 1;
const $ = id => document.getElementById(id);
const LINE_URL = $('lineAddFriend').href;
const LINE_ID = new URL(LINE_URL).pathname.split('/').at(-1);
const LINE_INQUIRY = '您好，我從阿人車庫-阿人業務介紹看到您們，想詢問這台車：';
const LINE_CONTACT_MESSAGE = [
  '您好，我是從外部網站-阿人車庫搜尋看見您們的線上車庫！',
  '在麻煩您們介紹及建議我車輛的部分😊'
].join('\n');

function createLineChatUrl(message) {
  const encodedMessage = encodeURIComponent(message).replace(/[!'()*]/g, char =>
    '%' + char.charCodeAt(0).toString(16).toUpperCase()
  );
  return `https://line.me/R/oaMessage/${LINE_ID}/?${encodedMessage}`;
}

const money = n => Number.isFinite(Number(n)) && n !== null ? "NT$ " + Number(n).toLocaleString("zh-TW") : "價格請洽詢";
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function marketplaceUrl(value, origin) {
  try {
    const url = new URL(value);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url.origin === origin && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}
const imageUrl = value => marketplaceUrl(value, 'https://cdn.store-assets.com');
function vehicleProductUrl(value) {
  const source = marketplaceUrl(value, 'https://shop.2motor.tw');
  if (!source) return '';
  const url = new URL(source);
  const product = url.pathname.match(/\/products\/[^/]+\/?$/);
  return product ? new URL(product[0], url.origin).href : '';
}
// Warranty verified against the original listings. Explicit as-is notices still take priority.
const confirmedWarrantyProducts = new Set([
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2023-%E4%B8%89%E9%99%BDsym-%E6%9B%BC%E5%B7%B4mmbcu-158-%E7%A2%9F%E7%85%9E-abs-tcs-2356',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2024-%E5%B1%B1%E8%91%89yamaha-mt-15-%E7%A2%9F%E7%85%9E-abs-6008',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2023-%E4%B8%89%E9%99%BDsym-%E9%87%8E%E7%8B%BC125-%E7%A2%9F%E7%85%9E-2176',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2023-%E4%B8%89%E9%99%BDsym-fiddle-125-%E7%A2%9F%E7%85%9E-1355',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2025-%E5%85%89%E9%99%BDkymco-%E5%A4%A7%E5%9C%B0%E5%90%8D%E6%B5%81125-%E9%BC%93%E7%85%9E-7319',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2025-%E4%B8%89%E9%99%BDstm-jet-sl-158-%E7%A2%9F%E7%85%9E-abs-tcs-5388',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2023-%E5%B1%B1%E8%91%89yamaha-mt-15-%E7%A2%9F%E7%85%9E-abs-8019',
  'https://shop.2motor.tw/products/-%E9%AB%98%E9%9B%84%E5%BA%97-2025-%E9%88%B4%E6%9C%A8suzuki-new-nex-125-%E7%A2%9F%E7%85%9E-3666',
  'https://shop.2motor.tw/products/2025-%E4%B8%89%E9%99%BDsym-mmbcu-158-%E5%B0%8F%E6%94%B9%E6%AC%BE-%E9%9D%9E%E9%9B%BB%E9%A9%85%E7%89%88%E6%9C%AC-9903',
]);
const brandLabels = new Map([...$('brandFilter').options].map(option => [option.value, option.text]));
const filterIds = ['search', 'storeFilter', 'brandFilter', 'categoryFilter', 'warrantyFilter', 'sortFilter'];
const filterForm = $('filterForm');
const filterDrawer = $('filterDrawer');
const filterToggle = $('openFilters');
const readFilters = () => Object.fromEntries(filterIds.map(id => [id, $(id).value.trim()]));
const defaultFilters = readFilters();
let activeFilters = { ...defaultFilters };
function vehicleCategories(bike, brand, model) {
  if (Array.isArray(bike.categories) && bike.categories.length) return bike.categories;
  const groups = [];
  const cc = bike.cc;
  if (brand === 'GOGORO' || /\b(?:EC-?0[25]|EMOVING|IONEX|UR1|AI-?[134])\b|電動車/i.test(model)) {
    groups.push('electric');
  } else if (Number.isFinite(cc) && cc > 0) {
    groups.push(cc <= 50 ? 'green-50' : cc <= 125 ? 'up-to-125' : cc <= 150 ? '126-150' : cc < 250 ? '151-249' : 'heavy');
  }
  if (brand === 'VESPA') groups.push('vespa');
  return groups;
}
function setOptions(id, values, defaultLabel) {
  const el = $(id), old = el.value;
  el.replaceChildren(new Option(defaultLabel, ''));
  values.filter(Boolean).sort((a,b)=>a.localeCompare(b,'zh-Hant')).forEach(v => el.add(new Option(v,v)));
  if ([...el.options].some(o=>o.value===old)) el.value=old;
}
function updateFilters() {
  setOptions(
    'storeFilter',
    [...new Set(bikes.map(b => b.store))],
    '全部門市'
  );
}
function normalizeSearchText(text) {
  return text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}
function createVehicleSearch(query) {
  const search = normalizeSearchText(query);
  const modelCode = search.replace(/[\s\p{Pd}\u2212]/gu, '');
  if (!/^[a-z]+\d[a-z0-9]*$/.test(modelCode)) {
    return bike => bike.searchText.includes(search);
  }

  const separator = '[\\s\\p{Pd}\\u2212]*';
  let modelPattern = modelCode.match(/[a-z]|\d+/g).join(separator);
  if (/^r15(?:v4m?|mv4)$/.test(modelCode)) {
    // The inventory uses both R15M V4 and R15 V4M for the M trim.
    const version = `v${separator}4(?!\\d)`;
    const trims = [`m${separator}${version}`, `${version}${separator}m`];
    if (modelCode === 'r15v4') trims.push(version);
    modelPattern = `r${separator}15${separator}(?:${trims.join('|')})`;
  }

  // A model code starts at a word boundary, and its number cannot be a prefix of another number.
  const pattern = new RegExp(`(?:^|[^a-z0-9])${modelPattern}(?!\\d)`, 'u');
  return bike => pattern.test(bike.modelSearchText);
}
function filtered() {
  const matchesSearch = createVehicleSearch(activeFilters.search);
  const {storeFilter: store, brandFilter: brand, categoryFilter: category, warrantyFilter: warranty, sortFilter: sort} = activeFilters;
  const result = bikes.filter(b =>
    matchesSearch(b) &&
    (!store || b.store === store) &&
    (!brand || b.brand === brand) &&
    (!category || b.categories.includes(category)) &&
    (!warranty || b.warrantyStatus === warranty)
  );
  if(sort==='low')result.sort((a,b)=>(a.price??Infinity)-(b.price??Infinity));
  if(sort==='high')result.sort((a,b)=>(b.price??-1)-(a.price??-1));
  return result;
}
function render(reset=false) {
  if(reset) currentPage=1;
  const result=filtered(), totalPages=Math.max(1,Math.ceil(result.length/PAGE_SIZE));
  currentPage=Math.min(currentPage,totalPages);
  const pageBikes=result.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  let warrantyCount = 0;
  let asIsCount = 0;
  for (const bike of result) {
    if (bike.warrantyStatus === 'warranty') warrantyCount++;
    if (bike.warrantyStatus === 'as-is') asIsCount++;
  }
  $('resultCount').textContent = result.length;
  $('warrantyCount').textContent = warrantyCount;
  $('asIsCount').textContent = asIsCount;
  $('pageInfo').textContent = `第 ${result.length ? currentPage : 0} / ${result.length ? totalPages : 0} 頁`;
  $('empty').hidden = result.length > 0;
  $('cards').innerHTML=pageBikes.map(b=>{
    const image=imageUrl(b.image_url);
    const img=image?`<img src="${escapeHTML(image)}" alt="${escapeHTML(b.model)} 車輛照片" loading="lazy">`:'<div class="no-image">暫無照片</div>';
    return `<article class="bike-card" tabindex="0" role="button" data-id="${escapeHTML(b.id)}" aria-label="查看 ${escapeHTML(b.model)}">
    <div class="bike-img">${img}${vehicleBadge(b)}</div>
    <div class="card-body"><div class="store-name">${escapeHTML(b.store||'門市待確認')}</div><div class="card-title">${escapeHTML(b.original_name||b.model)}</div>
    <div class="specs"><span>${b.year??'年份未提供'} 年</span><span>編號 ${escapeHTML(b.stock_number||'未提供')}</span></div>
    <div class="price-row"><div class="price">${money(b.price)}</div><span class="details-link">查看車輛 ↗</span></div></div></article>`;
  }).join('');
  $('cards').querySelectorAll('.bike-card').forEach(el=>{el.addEventListener('click',()=>openDetail(el.dataset.id));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openDetail(el.dataset.id)}})});
  renderPages(totalPages,result.length);
}
function renderPages(total,count) {
  const holder=$('pagination');holder.replaceChildren();if(count<=PAGE_SIZE)return;
  function btn(label,page,disabled=false,active=false) {
    const el=document.createElement('button');el.textContent=label;el.disabled=disabled;el.className=active?'active':'';
    el.addEventListener('click',()=>{currentPage=page;render();$('inventory').scrollIntoView();});holder.appendChild(el);
  }
  btn('上一頁',currentPage-1,currentPage===1);
  const candidates=new Set([1,total,currentPage-2,currentPage-1,currentPage,currentPage+1,currentPage+2]);
  let prev=0;
  [...candidates].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b).forEach(n=>{if(n-prev>1){const s=document.createElement('span');s.textContent='…';holder.appendChild(s)}btn(String(n),n,false,n===currentPage);prev=n});
  btn('下一頁',currentPage+1,currentPage===total);
}
function vehiclePreviewButton(className, preview, label) {
  return `<button type="button" class="vehicle-preview-trigger ${className}" data-vehicle-preview="${preview}" aria-expanded="false" aria-controls="vehiclePreview">${label}</button>`;
}
function vehicleBadge(bike, interactive = false) {
  if (!bike.warrantyStatus) return '';
  const asIs = bike.warrantyStatus === 'as-is';
  const className = asIs ? 'vehicle-badge as-is' : 'vehicle-badge';
  const label = `<span aria-hidden="true">🔧</span> ${asIs ? '現況車款' : '保固車款'}`;
  if (interactive) return vehiclePreviewButton(className, asIs ? 'asIsPreview' : 'warrantyPreview', label);
  return `<span class="${className}">${label}</span>`;
}

const modal = $('modal');
const modalBox = modal.querySelector('.modal-box');
const vehiclePreview = $('vehiclePreview');
const previewBackdrop = $('vehiclePreviewBackdrop');
const previewBody = $('vehiclePreviewBody');
const previewClose = $('closeVehiclePreview');
let modalOpener;
let activePreview = null;
let previewCloseTimer;

function closeVehiclePreview(restoreFocus = false) {
  window.clearTimeout(previewCloseTimer);
  if (!activePreview) return false;
  const { trigger } = activePreview;
  activePreview = null;
  trigger.setAttribute('aria-expanded', 'false');
  vehiclePreview.hidden = true;
  previewBackdrop.hidden = true;
  if (restoreFocus) trigger.focus({ preventScroll: true });
  return true;
}
function positionVehiclePreview() {
  if (!activePreview || activePreview.centered) return;
  const { left, top, bottom } = activePreview.trigger.getBoundingClientRect();
  const box = modalBox.getBoundingClientRect();
  if (bottom <= box.top || top >= box.bottom) {
    closeVehiclePreview();
    return;
  }
  const edge = 12;
  const { clientWidth, clientHeight } = document.documentElement;
  const below = clientHeight - bottom - edge;
  const above = top - edge;
  vehiclePreview.style.removeProperty('--preview-room');
  const showBelow = below >= vehiclePreview.offsetHeight || below >= above;
  vehiclePreview.style.setProperty('--preview-left', `${Math.max(edge, Math.min(left, clientWidth - vehiclePreview.offsetWidth - edge))}px`);
  vehiclePreview.style.setProperty('--preview-top', showBelow ? `${bottom}px` : 'auto');
  vehiclePreview.style.setProperty('--preview-bottom', showBelow ? 'auto' : `${clientHeight - top}px`);
  vehiclePreview.style.setProperty('--preview-room', `${showBelow ? below : above}px`);
}
function showVehiclePreview(trigger, pinned = false, centered = false) {
  window.clearTimeout(previewCloseTimer);
  if (!pinned && activePreview?.pinned) return;
  const sameTrigger = activePreview?.trigger === trigger;
  if (sameTrigger) {
    if (!pinned) return;
    if (activePreview.pinned) {
      closeVehiclePreview(true);
      return;
    }
  } else {
    closeVehiclePreview();
    const template = $(trigger.dataset.vehiclePreview);
    $('vehiclePreviewTitle').textContent = template.dataset.heading;
    previewBody.replaceChildren(template.content.cloneNode(true));
    vehiclePreview.dataset.kind = template.id;
  }
  activePreview = { trigger, pinned, centered };
  trigger.setAttribute('aria-expanded', 'true');
  vehiclePreview.classList.toggle('is-anchored', !centered);
  previewBackdrop.hidden = !centered;
  vehiclePreview.hidden = false;
  if (centered) vehiclePreview.style.removeProperty('--preview-room');
  if (!sameTrigger) previewBody.scrollTop = 0;
  positionVehiclePreview();
  if (pinned) previewClose.focus({ preventScroll: true });
}
function scheduleVehiclePreviewClose(event) {
  if (event.pointerType !== 'mouse' || !activePreview || activePreview.pinned) return;
  window.clearTimeout(previewCloseTimer);
  previewCloseTimer = window.setTimeout(() => {
    if (!activePreview?.trigger.matches(':hover') && !vehiclePreview.matches(':hover') &&
        !vehiclePreview.contains(document.activeElement)) closeVehiclePreview();
  }, 180);
}
function setupVehiclePreviewTriggers() {
  for (const trigger of $('modalContent').querySelectorAll('[data-vehicle-preview]')) {
    trigger.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') showVehiclePreview(trigger);
    });
    trigger.addEventListener('pointerleave', scheduleVehiclePreviewClose);
    trigger.addEventListener('click', event => {
      const centered = event.pointerType === 'touch' || event.pointerType === 'pen' ||
        (event.pointerType !== 'mouse' && window.matchMedia('(pointer: coarse)').matches);
      showVehiclePreview(trigger, true, centered);
    });
  }
}

previewClose.addEventListener('click', () => closeVehiclePreview(true));
previewBackdrop.addEventListener('click', () => closeVehiclePreview(true));
vehiclePreview.addEventListener('pointerenter', () => window.clearTimeout(previewCloseTimer));
vehiclePreview.addEventListener('pointerleave', scheduleVehiclePreviewClose);
modalBox.addEventListener('scroll', positionVehiclePreview);
window.addEventListener('resize', positionVehiclePreview);

function setupGallery(photos, model) {
  if (photos.length < 2) return;
  const gallery = $('modalContent').querySelector('.vehicle-gallery');
  const stage = gallery.querySelector('.gallery-stage');
  const thumbs = [...gallery.querySelectorAll('[data-photo]')];
  let index = 0;
  function show(next) {
    index = (next + photos.length) % photos.length;
    const photo = document.createElement('img');
    photo.src = photos[index];
    photo.alt = `${model} 第 ${index + 1} 張照片`;
    stage.querySelector('.gallery-image').replaceChildren(photo);
    gallery.querySelector('.gallery-count').textContent = `${index + 1} / ${photos.length}`;
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-pressed', i === index));
    const thumb = thumbs[index];
    const strip = thumb.parentElement;
    if (thumb.offsetLeft < strip.scrollLeft) strip.scrollLeft = thumb.offsetLeft;
    if (thumb.offsetLeft + thumb.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollLeft = thumb.offsetLeft + thumb.offsetWidth - strip.clientWidth;
    }
  }
  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => show(i)));
  gallery.querySelector('.gallery-prev').addEventListener('click', () => show(index - 1));
  gallery.querySelector('.gallery-next').addEventListener('click', () => show(index + 1));
  gallery.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });
}
function drawVehicleLineQr(canvas, url) {
  if (typeof qrcode !== 'function') return false;
  const context = canvas.getContext('2d');
  if (!context) return false;
  const code = qrcode(0, 'M');
  code.addData(url);
  try {
    code.make();
  } catch (error) {
    console.warn('RenMotor LINE QR error:', error);
    return false;
  }
  const modules = code.getModuleCount();
  const quietZone = 4;
  const cell = 5;
  const size = (modules + 2 * quietZone) * cell;
  canvas.width = canvas.height = size;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#000';
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (code.isDark(row, column)) {
        context.fillRect((column + quietZone) * cell, (row + quietZone) * cell, cell, cell);
      }
    }
  }
  return true;
}

const vehicleLineDialog = $('vehicleLineDialog');
const vehicleLineDraft = $('vehicleLineDraft');
const vehicleLineStatus = $('vehicleLineStatus');
const lineDialogTitle = $('vehicleLineTitle');
const lineDialogDescription = $('vehicleLineDescription');
const vehicleInquiryTitle = lineDialogTitle.textContent;
const vehicleInquiryDescription = lineDialogDescription.textContent;
let lineDialogOpener;

function showLineDialog({ url, message, opener, title = vehicleInquiryTitle, description = vehicleInquiryDescription }) {
  if (vehicleLineDialog.open) return;
  closeVehiclePreview();
  const canvas = $('vehicleLineQr');
  lineDialogOpener = opener;
  lineDialogTitle.textContent = title;
  lineDialogDescription.textContent = description;
  $('vehicleLineChat').href = url;
  vehicleLineDraft.value = message;
  vehicleLineDraft.hidden = true;
  vehicleLineStatus.textContent = '';
  canvas.hidden = !drawVehicleLineQr(canvas, url);
  vehicleLineDialog.showModal();
  vehicleLineDialog.scrollTop = 0;
}

$('vehicleLineAddFriend').href = LINE_URL;

const contactLineUrl = createLineChatUrl(LINE_CONTACT_MESSAGE);
const supportsLineAppLink = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
for (const link of document.querySelectorAll('[data-line-contact]')) {
  link.href = contactLineUrl;
  if (supportsLineAppLink) continue;
  link.setAttribute('aria-haspopup', 'dialog');
  link.setAttribute('aria-controls', 'vehicleLineDialog');
  link.addEventListener('click', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    showLineDialog({
      url: contactLineUrl,
      message: LINE_CONTACT_MESSAGE,
      opener: link,
      title: '聯繫貳輪嶼官方 LINE',
      description: '用手機掃描 QR Code，即可在聊天室帶入詢問訊息。'
    });
  });
}

$('closeVehicleLineDialog').addEventListener('click', () => vehicleLineDialog.close());
vehicleLineDialog.addEventListener('click', event => {
  if (event.target !== vehicleLineDialog) return;
  const { left, right, top, bottom } = vehicleLineDialog.getBoundingClientRect();
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
    vehicleLineDialog.close();
  }
});
vehicleLineDialog.addEventListener('close', () => {
  if (!vehicleLineDialog.open) lineDialogOpener?.focus({ preventScroll: true });
});
$('copyVehicleLineDraft').addEventListener('click', async () => {
  const message = vehicleLineDraft.value;
  let copied = false;
  try {
    await navigator.clipboard.writeText(message);
    copied = true;
  } catch {
    // Allow manual copying when clipboard access is unavailable.
  }
  if (!vehicleLineDialog.open || vehicleLineDraft.value !== message) return;
  vehicleLineDraft.hidden = copied;
  vehicleLineStatus.textContent = copied ? '已複製，可貼到 LINE 聊天室。' : '請複製已選取的詢問內容。';
  if (!copied) {
    vehicleLineDraft.focus();
    vehicleLineDraft.select();
  }
});

function openDetail(id) {
  const b=bikes.find(x=>x.id===id);if(!b)return;
  closeVehiclePreview();
  modalOpener = document.activeElement;
  const vehicleName = b.original_name || b.model;
  const lineMessage = [LINE_INQUIRY, vehicleName, b.productUrl].filter(Boolean).join('\n');
  const lineChatUrl = createLineChatUrl(lineMessage);
  const photos = [...new Set(b.image_urls.map(imageUrl).filter(Boolean))];
  const cover = imageUrl(b.image_url);
  if (!photos.length && cover) photos.push(cover);
  const controls = photos.length > 1 ? `
    <button type="button" class="gallery-prev" aria-label="上一張照片">‹</button>
    <button type="button" class="gallery-next" aria-label="下一張照片">›</button>
    <span class="gallery-count" aria-live="polite">1 / ${photos.length}</span>` : '';
  const thumbnails = photos.length > 1 ? `<div class="gallery-thumbs">${photos.map((url, i) =>
    `<button type="button" data-photo="${i}" aria-label="查看第 ${i + 1} 張照片" aria-pressed="${i === 0}"><img src="${escapeHTML(url)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
  $('modalContent').innerHTML=`<section class="vehicle-gallery" aria-label="車輛照片">
    <div class="gallery-stage"><div class="gallery-image">${photos.length ? `<img src="${escapeHTML(photos[0])}" alt="${escapeHTML(b.model)} 第 1 張照片">` : '<div class="no-image">暫無照片</div>'}</div>${controls}</div>
    ${thumbnails}
  </section>
  <div class="modal-info"><div class="eyebrow">${escapeHTML(b.store||'門市待確認')}</div><h2 id="modalTitle">${escapeHTML(vehicleName)}</h2>
  <div class="vehicle-preview-actions">
    ${vehicleBadge(b, true)}
    ${vehiclePreviewButton('contract-trigger', 'contractPreview', '<span aria-hidden="true">📜</span> 定型化契約預覽')}
  </div>
  <div class="price">${money(b.price)}</div>
  <div class="detail-grid">
    <div class="detail-cell"><small>年份</small><strong>${b.year??'未提供'}</strong></div>
    <div class="detail-cell"><small>車輛編號</small><strong>${escapeHTML(b.stock_number||'未提供')}</strong></div>
    <div class="detail-cell"><small>門市</small><strong>${escapeHTML(b.store||'待確認')}</strong></div>
    <div class="detail-cell"><small>里程</small><strong>${escapeHTML(b.mileage || '未提供')}</strong></div>
  </div>
  <section class="vehicle-contact" aria-labelledby="vehicleContactTitle">
    <h3 id="vehicleContactTitle">看中這台車了嗎？</h3>
    <p>透過阿人車庫找到喜歡的車款後，歡迎使用貳輪嶼官方 LINE 進行諮詢，我們將協助您確認車輛資訊、安排賞車及後續購車事宜。</p>
    <button class="line-btn line-action" id="openVehicleLineDialog" type="button" aria-haspopup="dialog" aria-controls="vehicleLineDialog">透過貳輪嶼官方 LINE 詢問</button>
    <p class="vehicle-contact-note">※ 點擊後將導向貳輪嶼全公司官方 LINE，建議提供車輛名稱或截圖，並告知客服『從阿人車庫 RenMotor_ 看到此車』。</p>
  </section>
  <section class="vehicle-services" aria-labelledby="servicesTitle">
    <h3 id="servicesTitle">保障服務</h3>
    <ul>
      <li>✅ 買賣履約保證，交易更安心</li>
      <li>✅ 保證無重大事故、無泡水、非 AB 車</li>
      <li>✅ 可無卡分期 &amp; 提供六期零利率</li>
      <li>✅ 車換車補價差，提供線上估價</li>
      <li>✅ 可協助托運，全台配送</li>
    </ul>
  </section></div>`;
  modal.classList.add('open');
  setupGallery(photos, b.model);
  setupVehiclePreviewTriggers();
  $('openVehicleLineDialog').addEventListener('click', event => {
    showLineDialog({ url: lineChatUrl, message: lineMessage, opener: event.currentTarget });
    trackVehicleEvent('line_inquiry_click', b);
  });
  document.body.classList.add('modal-lock');
  modalBox.scrollTop = 0;
  $('closeModal').focus({ preventScroll: true });
  trackVehicleEvent('vehicle_detail_view', b);
}
function closeModal() {
  closeVehiclePreview();
  if (vehicleLineDialog.open) vehicleLineDialog.close();
  modal.classList.remove('open');
  document.body.classList.remove('modal-lock');
  modalOpener?.focus({ preventScroll: true });
  modalOpener = null;
}
function showMissingImage(event) {
  if (!(event.target instanceof HTMLImageElement)) return;
  const empty = document.createElement('div');
  empty.className = 'no-image';
  empty.textContent = '暫無照片';
  event.target.replaceWith(empty);
}
$('cards').addEventListener('error', showMissingImage, true);
$('modalContent').addEventListener('error', showMissingImage, true);
$('closeModal').addEventListener('click',closeModal);
modal.addEventListener('click', event => {
  if (event.target.closest('#vehiclePreview, [data-vehicle-preview]')) return;
  if (!closeVehiclePreview() && event.target === modal) closeModal();
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || !modal.classList.contains('open') || vehicleLineDialog.open) return;
  if (closeVehiclePreview(true)) event.preventDefault();
  else closeModal();
});

function applyFilters() {
  activeFilters = readFilters();
  const hasFilters = filterIds.some(id => activeFilters[id] !== defaultFilters[id]);
  filterToggle.classList.toggle('has-filters', hasFilters);
  filterToggle.setAttribute('aria-label', hasFilters ? '篩選車款，已套用條件' : '篩選車款');
  render(true);
  $('inventory').scrollIntoView();
}
filterToggle.addEventListener('click', () => {
  for (const id of filterIds) $(id).value = activeFilters[id];
  filterDrawer.showModal();
  filterToggle.setAttribute('aria-expanded', 'true');
});
$('closeFilters').addEventListener('click', () => filterDrawer.close());
$('search').addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  filterDrawer.close();
});
filterDrawer.addEventListener('click', event => {
  if (event.target === filterDrawer && event.clientX < filterDrawer.getBoundingClientRect().left) filterDrawer.close();
});
filterDrawer.addEventListener('close', () => {
  filterToggle.setAttribute('aria-expanded', 'false');
  filterToggle.focus({ preventScroll: true });
});
filterForm.addEventListener('submit', event => {
  event.preventDefault();
  filterDrawer.close();
  applyFilters();
});
$('resetBtn').addEventListener('click', () => {
  filterForm.reset();
  applyFilters();
});
async function loadVehicles() {
  try {
    const response=await fetch('./vehicles.json?ts='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data))throw new Error('資料格式錯誤');
    bikes = data.map((b, i) => {
      const model = String(b.model || '');
      const name = String(b.original_name || model);
      const store = String(b.store || '門市待確認');
      const stockNumber = String(b.stock_number || '');
      const brand = /GOGORO|睿能/i.test(`${name} ${model}`) ? 'GOGORO' : String(b.brand || '其他').trim().toUpperCase();
      const asIs = b.as_is === true || `${name} ${model} ${b.description || ''}`.includes('現況');
      const productUrl = vehicleProductUrl(b.source_url);
      const hasWarranty = b.warranty === true || confirmedWarrantyProducts.has(productUrl.replace(/\/$/, ''));
      let mileage = typeof b.mileage === 'string' ? b.mileage.trim() : '';
      if (!mileage && Number.isSafeInteger(b.km) && b.km >= 0) {
        mileage = `約 ${b.km.toLocaleString('zh-TW')} 公里`;
      }
      return {
        id: String(b.source_url || i),
        store, brand, model, original_name: name, stock_number: stockNumber,
        year: Number.isInteger(b.year) ? b.year : null,
        price: Number.isFinite(b.price) ? b.price : null,
        mileage,
        productUrl,
        image_url: String(b.image_url || ''),
        image_urls: Array.isArray(b.image_urls) ? b.image_urls : [],
        categories: vehicleCategories(b, brand, model),
        warrantyStatus: asIs ? 'as-is' : hasWarranty ? 'warranty' : '',
        searchText: normalizeSearchText([name, model, stockNumber, brandLabels.get(brand) || brand, store].join(' ')),
        modelSearchText: normalizeSearchText(`${name} | ${model}`)
      };
    });
    const updated = $('inventoryUpdated');
    const modified = updated.dateTime || response.headers.get('Last-Modified');
    const timestamp = modified ? Date.parse(modified) : NaN;
    if (Number.isFinite(timestamp)) {
      const date = new Date(timestamp);
      updated.dateTime = date.toISOString();
      updated.textContent = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      }).format(date);
    }
    updateFilters();render(true);
    $('syncStatus').textContent=`已載入 ${bikes.length} 筆公開商品資料。資料為定期更新，非即時庫存。`;
  } catch(error) {
    $('syncStatus').textContent='目前無法讀取車庫資料，請確認 vehicles.json 已上傳及自動同步流程正常。';
    $('empty').hidden = false;
    $('empty').textContent = '車庫資料尚未準備完成。';
    console.error('RenMotor load error:',error);
  }
}
$('pageSize').textContent = PAGE_SIZE;
loadVehicles();
