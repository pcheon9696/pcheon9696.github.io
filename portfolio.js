(() => {
  'use strict';
  const paths={arrow:'<path d="M4 12h15m-5-5 5 5-5 5"/>',external:'<path d="M6 18 18 6M6 6h12v12"/>',down:'<path d="M12 4v16m-6-6 6 6 6-6"/>',up:'<path d="M12 20V4m-6 6 6-6 6 6"/>',play:'<path d="m9 5 11 7-11 7Z"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',menu:'<path d="M4 7h16M4 17h16"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',film:'<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 4v16m10-16v16M3 9h4m-4 6h4m10-6h4m-4 6h4"/>'};
  const icon=(name,size=20)=>`<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||''}</svg>`;
  document.querySelectorAll('[data-icon]').forEach(el=>{el.outerHTML=icon(el.dataset.icon,Number(el.dataset.iconSize||20));});
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const preferred=['브랜드·인터뷰','유튜브·콘텐츠','교육·B2B','라이브·뮤직','숏폼'];
  const descriptions={'브랜드·인터뷰':'브랜드 콘텐츠 · 캠페인 인터뷰','유튜브·콘텐츠':'롱폼 · 시리즈 · 리뷰 콘텐츠','교육·B2B':'온라인 강의 · 교육 시리즈','라이브·뮤직':'밴드 커버 · 뮤직 콘텐츠','숏폼':'YouTube Shorts'};
  const state={works:[],featured:[],ordered:[],categories:[],category:'전체',search:'',visible:6,hero:0};
  const dialog=$('#workDialog');
  let previousFocus=null,previousOverflow='',playerTimer=null;

  function setMenu(open){
    $('#pf-mobile-navigation').hidden=!open;
    $('#mobileMenuButton').setAttribute('aria-expanded',String(open));
    $('#mobileMenuButton').setAttribute('aria-label',open?'메뉴 닫기':'메뉴 열기');
    $('#mobileMenuButton').innerHTML=icon(open?'close':'menu',24);
  }
  function jump(id){setMenu(false);document.getElementById(id)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  document.querySelectorAll('[data-jump]').forEach(el=>el.addEventListener('click',event=>{event.preventDefault();jump(el.dataset.jump);}));
  $('#mobileMenuButton').addEventListener('click',()=>setMenu($('#mobileMenuButton').getAttribute('aria-expanded')!=='true'));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#pf-mobile-navigation').hidden){setMenu(false);$('#mobileMenuButton').focus();}});
  matchMedia('(max-width:700px)').addEventListener('change',()=>setMenu(false));
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting)document.querySelectorAll('.pf-desktop-nav a').forEach(link=>link.classList.toggle('active',link.dataset.jump===entry.target.id));},{rootMargin:'-15% 0px -65% 0px'});
  ['pf-selected','pf-work','pf-about','pf-contact'].forEach(id=>observer.observe(document.getElementById(id)));

  function videoId(work){
    if(/^[\w-]{11}$/.test(work.videoId||''))return work.videoId;
    try{const url=new URL(work.url),host=url.hostname.replace(/^www\./,'');const id=host==='youtu.be'?url.pathname.split('/').filter(Boolean)[0]:host==='youtube.com'?(url.pathname.startsWith('/shorts/')?url.pathname.split('/')[2]:url.searchParams.get('v')):'';return /^[\w-]{11}$/.test(id||'')?id:'';}catch{return '';}
  }
  function imageFor(work,large=false){const id=videoId(work);return id?`https://i.ytimg.com/vi/${id}/${large?'maxresdefault':'hqdefault'}.jpg`:(work.thumbnail||'');}
  function makeImage(work,{eager=false,large=false}={}){
    const frame=document.createElement('div');frame.className='pf-image';frame.innerHTML=`<span class="pf-image-placeholder">${icon('film',30)}<span>영상 썸네일</span></span>`;
    const image=document.createElement('img');image.alt='';image.loading=eager?'eager':'lazy';image.decoding='async';
    let fallbackUsed=!large;
    image.addEventListener('error',()=>{if(!fallbackUsed&&videoId(work)){fallbackUsed=true;image.src=imageFor(work);}else image.remove();});
    const source=imageFor(work,large);if(source){image.src=source;frame.append(image);}
    const shade=document.createElement('span');shade.className='pf-image-shade';
    const play=document.createElement('span');play.className='pf-image-play';play.innerHTML=icon('play',20);frame.append(shade,play);return frame;
  }
  function makeCard(work,variant='gallery',index=0){
    const card=document.createElement('button');card.type='button';card.className=`pf-work-card pf-card-${variant}`;card.setAttribute('aria-label',`작업 보기: ${work.title}`);card.dataset.workId=work.id||videoId(work)||work.url;
    const visual=document.createElement('div');visual.className='pf-card-visual';visual.append(makeImage(work,{large:!!work.featuredOrder}));
    const number=document.createElement('span');number.className='pf-work-index';number.textContent=String(variant==='gallery'?index+1:work.featuredOrder||index+1).padStart(2,'0');visual.append(number);
    const info=document.createElement('div');info.className='pf-card-info';info.innerHTML=`<div class="pf-card-category"><span>${esc(work.category)}</span>${icon('external',18)}</div><h3>${esc(work.title)}</h3>${variant==='lead'?`<span class="pf-card-view">작업 자세히 보기 ${icon('arrow',17)}</span>`:''}`;
    card.append(visual,info);card.addEventListener('click',()=>openWork(work));return card;
  }
  function renderHero(announce=false){
    const work=state.featured[state.hero];
    ['heroPrevious','heroNext','heroFilm','heroDetails'].forEach(id=>{document.getElementById(id).disabled=!work||((id==='heroPrevious'||id==='heroNext')&&state.featured.length<2);});
    if(!work){$('#heroTitle').textContent='등록된 대표 작업이 없습니다.';return;}
    const play=document.createElement('span');play.className='pf-hero-play';play.innerHTML=icon('play',28);$('#heroFilm').replaceChildren(makeImage(work,{eager:true,large:true}),play);
    $('#heroFilm').setAttribute('aria-label',`대표 영상 보기: ${work.title}`);$('#heroDetails').setAttribute('aria-label',`대표 영상 상세 보기: ${work.title}`);
    $('#heroCategory').textContent=work.category;$('#heroTitle').textContent=work.title;$('#heroCounter').innerHTML=`${String(state.hero+1).padStart(2,'0')} <i>/</i> ${String(state.featured.length).padStart(2,'0')}`;
    if(announce)$('#heroAnnouncement').textContent=`대표 영상 ${state.hero+1}/${state.featured.length}. ${work.title}`;
  }
  function changeHero(direction){if(!state.featured.length)return;state.hero=(state.hero+direction+state.featured.length)%state.featured.length;renderHero(true);}
  $('#heroPrevious').addEventListener('click',()=>changeHero(-1));$('#heroNext').addEventListener('click',()=>changeHero(1));
  $('#heroFilm').addEventListener('click',()=>{if(state.featured[state.hero])openWork(state.featured[state.hero]);});$('#heroDetails').addEventListener('click',()=>{if(state.featured[state.hero])openWork(state.featured[state.hero]);});
  $('.pf-hero-work').addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();changeHero(event.key==='ArrowLeft'?-1:1);}});
  function renderFeatured(){
    $('#featuredCount').textContent=String(state.featured.length).padStart(2,'0');$('#archiveCount').textContent=String(state.works.length).padStart(2,'0');const grid=$('#selectedGrid');grid.replaceChildren();
    if(!state.featured.length){grid.innerHTML='<p class="pf-data-error">등록된 대표 작업이 없습니다.</p>';return;}
    grid.append(makeCard(state.featured[0],'lead'));const support=document.createElement('div');support.className='pf-selected-support';state.featured.slice(1).forEach(work=>support.append(makeCard(work,'small')));grid.append(support);
  }
  function pickCategory(category,scroll=false){
    state.category=category;state.visible=6;if(scroll){state.search='';$('#workSearch').value='';jump('pf-work');}
    $('#filters').querySelectorAll('button').forEach(button=>{const active=button.dataset.category===category;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));});renderGallery();
  }
  function renderCategories(){
    const filters=$('#filters');filters.replaceChildren();
    ['전체',...state.categories].forEach(category=>{const button=document.createElement('button');button.type='button';button.dataset.category=category;button.className=category===state.category?'active':'';button.setAttribute('aria-pressed',String(category===state.category));const badge=document.createElement('span');badge.textContent=category==='전체'?state.works.length:state.works.filter(work=>work.category===category).length;button.append(document.createTextNode(category),badge);button.addEventListener('click',()=>pickCategory(category));filters.append(button);});
    const fields=$('#heroFields'),about=$('#fieldList');fields.replaceChildren();about.replaceChildren();
    state.categories.forEach((category,index)=>{const field=document.createElement('button');field.type='button';field.innerHTML=`<span>${esc(category)}</span>${index<state.categories.length-1?'<i aria-hidden="true">/</i>':''}`;field.addEventListener('click',()=>pickCategory(category,true));fields.append(field);const row=document.createElement('button');row.type='button';row.innerHTML=`<span class="pf-field-number">${String(index+1).padStart(2,'0')}</span><span><strong>${esc(category)}</strong><small>${esc(descriptions[category]||'')}</small></span>${icon('external',19)}`;row.addEventListener('click',()=>pickCategory(category,true));about.append(row);});
  }
  function renderGallery(){
    const query=state.search.trim().toLocaleLowerCase('ko');const filtered=state.ordered.filter(work=>(state.category==='전체'||work.category===state.category)&&(work.title+' '+work.category+' '+(work.format||'')).toLocaleLowerCase('ko').includes(query));const visible=filtered.slice(0,state.visible),grid=$('#workGrid');grid.replaceChildren();visible.forEach(work=>grid.append(makeCard(work,'gallery',state.ordered.indexOf(work))));
    $('#emptyState').hidden=filtered.length!==0;$('#loadMoreSection').hidden=visible.length>=filtered.length;$('#remainingCount').textContent=`${filtered.length-visible.length}개 남음`;$('#resultsInfo').innerHTML=`<span>${esc(state.category==='전체'?'모든 작업':state.category)} <strong>${filtered.length}</strong></span><span>${query?'“'+esc(state.search)+'” 검색 결과 · ':''}${visible.length} / ${filtered.length} 표시</span>`;
  }
  $('#workSearch').addEventListener('input',event=>{state.search=event.target.value;state.visible=6;renderGallery();});$('#resetSearch').addEventListener('click',()=>{state.search='';$('#workSearch').value='';pickCategory('전체');$('#workSearch').focus();});
  $('#loadMore').addEventListener('click',event=>{const previousCount=state.visible;state.visible+=6;renderGallery();if(event.detail===0)$('#workGrid').children[previousCount]?.focus();});
  function openWork(work){
    previousFocus=document.activeElement;previousOverflow=document.body.style.overflow;$('#workDialogTitle').textContent=work.title;$('#workDialogCategory').textContent=work.category;$('#youtubeLink').href=work.url;$('#originalVideoLink').href=work.url;$('#playerHelp').textContent='재생이 제한되거나 원활하지 않으면 YouTube에서 확인해주세요.';
    const player=$('#workPlayer');player.className='pf-player'+(work.category==='숏폼'?' pf-player-short':'');const start=document.createElement('button');start.type='button';start.className='pf-player-start';start.setAttribute('aria-label',`${work.title} 영상 재생`);const image=document.createElement('img');image.src=imageFor(work,!!work.featuredOrder);image.alt=`${work.title} 영상 썸네일`;image.addEventListener('error',()=>{if(image.src!==imageFor(work))image.src=imageFor(work);},{once:true});const overlay=document.createElement('span');overlay.className='pf-player-start-overlay';overlay.innerHTML=`<span class="pf-player-circle">${icon('play',30)}</span><span>영상 재생</span>`;start.append(image,overlay);start.addEventListener('click',()=>playWork(work));player.replaceChildren(start);
    $('#workDetails').innerHTML=`<div><dt>작업 분야</dt><dd>${esc(work.category)}</dd></div>${work.format?`<div><dt>영상 형식</dt><dd>${esc(work.format)}</dd></div>`:''}<div><dt>자료 출처</dt><dd>박치헌 영상 편집 포트폴리오</dd></div>`;document.body.style.overflow='hidden';dialog.showModal();
  }
  function playWork(work){
    const id=videoId(work);if(!id){$('#playerHelp').textContent='이 영상은 원본 링크에서 확인해주세요.';return;}
    const player=$('#workPlayer'),loading=document.createElement('span');loading.className='pf-player-loading';loading.setAttribute('role','status');loading.textContent='영상 플레이어를 불러오고 있습니다.';const iframe=document.createElement('iframe');iframe.title=`${work.title} YouTube 영상 플레이어`;iframe.src=`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.allowFullscreen=true;iframe.addEventListener('load',()=>{clearTimeout(playerTimer);loading.remove();});iframe.addEventListener('error',()=>{$('#playerHelp').textContent='플레이어를 불러오지 못했습니다. YouTube에서 확인해주세요.';});playerTimer=setTimeout(()=>{$('#playerHelp').textContent='플레이어가 늦게 열리면 YouTube에서 확인해주세요.';},10000);player.replaceChildren(loading,iframe);
  }
  const closeWork=()=>dialog.close();$('#closeDialog').addEventListener('click',closeWork);dialog.addEventListener('cancel',event=>{event.preventDefault();closeWork();});dialog.addEventListener('close',()=>{clearTimeout(playerTimer);$('#workPlayer').replaceChildren();document.body.style.overflow=previousOverflow;previousFocus?.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeWork();});
  dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const elements=[...dialog.querySelectorAll('button:not([disabled]), a[href], iframe, [tabindex]:not([tabindex="-1"])')].filter(element=>element.getClientRects().length>0),first=elements[0],last=elements[elements.length-1];if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
  function showLoadError(){
    $('#heroTitle').textContent='작업 목록을 불러오지 못했습니다.';for(const element of [$('#selectedGrid'),$('#workGrid')]){element.innerHTML='<div class="pf-data-error"><p>작업 목록을 불러오지 못했습니다. 다시 시도해주세요.</p><button type="button" class="pf-secondary">다시 불러오기</button></div>';element.querySelector('button').addEventListener('click',loadPortfolio);}$('#resultsInfo').textContent='작업 목록을 불러오지 못했습니다.';
  }
  async function loadPortfolio(){
    try{
      const response=await fetch(`portfolio-data.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error('Portfolio request failed: '+response.status);const data=await response.json(),seen=new Set();
      state.works=(Array.isArray(data.works)?data.works:[]).filter(work=>{if(work.visible===false||!work.title||!work.url)return false;try{if(!['https:','http:'].includes(new URL(work.url).protocol))return false;}catch{return false;}const key=videoId(work)||work.url;if(seen.has(key))return false;seen.add(key);return true;});
      state.featured=state.works.filter(work=>Number.isInteger(work.featuredOrder)&&work.featuredOrder>0).sort((a,b)=>a.featuredOrder-b.featuredOrder).slice(0,5);state.ordered=[...state.featured,...state.works.filter(work=>!state.featured.includes(work))];const present=new Set(state.works.map(work=>work.category).filter(Boolean)),order=Array.isArray(data.categories)?data.categories:preferred;state.categories=[...order.filter(category=>present.has(category)),...[...present].filter(category=>!order.includes(category))];state.hero=0;renderHero();renderFeatured();renderCategories();renderGallery();
    }catch(error){console.error(error);showLoadError();}
  }
  loadPortfolio();
})();
