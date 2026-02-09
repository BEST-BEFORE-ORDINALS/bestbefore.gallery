(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))s(n);new MutationObserver(n=>{for(const d of n)if(d.type==="childList")for(const b of d.addedNodes)b.tagName==="LINK"&&b.rel==="modulepreload"&&s(b)}).observe(document,{childList:!0,subtree:!0});function r(n){const d={};return n.integrity&&(d.integrity=n.integrity),n.referrerPolicy&&(d.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?d.credentials="include":n.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function s(n){if(n.ep)return;n.ep=!0;const d=r(n);fetch(n.href,d)}})();const J=document.querySelector("#app"),I=new Intl.NumberFormat("en-US"),U={open:"OPEN",sealed:"SEALED",expired:"EXPIRED"},R={open:"is-open",sealed:"is-sealed",expired:"is-expired"},K=3200,Q=1800,ee=[.72,1.25,1.82],te=[.72,1.05,1.38],e={activeView:"gallery",galleryMode:"carousel",summary:null,items:[],aboutFaq:"",storyAssets:{},carousel:{items:[],index:0,dragOffset:0,pendingDragOffset:0,dragStartX:0,dragging:!1,hovering:!1,timer:null,dragRaf:null,loadedIndexes:new Set,immersive:!1},heartbeat:{items:[],index:0,zoomLevel:1,hovering:!1,timer:null,dragging:!1,dragStartX:0,dragStartScrollLeft:0,settleTimer:null,initialized:!1}},S=a=>String(a).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;"),B=a=>a===null?"Unknown":`Nº${a}`,ae=(a,t,r)=>{let s=a-t;return s>r/2&&(s-=r),s<-r/2&&(s+=r),s},H=(a,t)=>a.filter(r=>r.status===t).length,re=()=>{e.carousel.timer&&(window.clearInterval(e.carousel.timer),e.carousel.timer=null),e.carousel.dragRaf&&(window.cancelAnimationFrame(e.carousel.dragRaf),e.carousel.dragRaf=null),e.heartbeat.timer&&(window.clearInterval(e.heartbeat.timer),e.heartbeat.timer=null),e.heartbeat.settleTimer&&(window.clearTimeout(e.heartbeat.settleTimer),e.heartbeat.settleTimer=null)},se=()=>{J.innerHTML=`
    <div class="bb-root">
      <div class="bb-grain" aria-hidden="true"></div>

      <section class="bb-intro" id="bbIntro" aria-label="Landing intro">
        <div class="bb-intro__core">
          <div class="bb-intro__logo-shell">
            <img class="bb-intro__logo bb-intro__logo--uploaded" src="/assets/logo/bb-uploaded-logo.jpeg" alt="BEST BEFORE logo" />
            <span class="bb-intro__hourglass" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--top" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--stream" aria-hidden="true"></span>
            <span class="bb-intro__sand bb-intro__sand--bottom" aria-hidden="true"></span>
          </div>
          <h1 class="bb-intro__title">BEST BEFORE</h1>
          <p class="bb-intro__caption">BY LEMONHAZE X ORDINALLY</p>
          <button class="bb-intro__enter" id="bbEnterButton" type="button">ENTER MUSEUM</button>
        </div>
      </section>

      <main class="bb-experience">
        <header class="bb-menu">
          <div class="bb-menu__brand-wrap">
            <img src="/assets/logo/bb-uploaded-logo.jpeg" alt="BB" class="bb-menu__mark bb-menu__mark--uploaded" />
            <div class="bb-menu__brand-copy">
              <button class="bb-menu__brand" id="bbBrandButton" type="button">BEST BEFORE</button>
              <p class="bb-menu__subbrand">by Lemonhaze x ORDINALLY</p>
            </div>
          </div>

          <nav class="bb-menu__nav" aria-label="Museum views">
            <button class="bb-menu__item is-active" data-view="gallery" type="button">GALLERY</button>
            <button class="bb-menu__item" data-view="lifecycle" type="button">LIFECYCLE</button>
            <button class="bb-menu__item" data-view="diary" type="button">BEYOND</button>
          </nav>

          <div class="bb-menu__stats" id="bbMenuStats">Loading collection snapshot...</div>
        </header>

        <section class="bb-content">
          <section class="bb-view bb-view--open is-active" data-view="gallery">
            <div class="bb-gallery-tools">
              <div class="bb-mode-toggle" role="tablist" aria-label="Gallery mode">
                <button class="bb-mode-btn is-active" data-mode="carousel" type="button">Slideshow</button>
                <button class="bb-mode-btn" data-mode="heartbeat" type="button">
                  <span class="bb-live-dot" aria-hidden="true"></span>
                  Live
                </button>
              </div>
              <div class="bb-heartbeat-zoom" id="bbHeartbeatZoomWrap" hidden aria-hidden="true">
                <span class="bb-heartbeat-zoom__label">Pulse Zoom</span>
                <div class="bb-heartbeat-zoom__controls">
                  <button id="bbHeartbeatZoomOut" type="button" aria-label="Decrease heartbeat zoom">−</button>
                  <span id="bbHeartbeatZoomLevel" class="bb-heartbeat-zoom__level">2 / 3</span>
                  <button id="bbHeartbeatZoomIn" type="button" aria-label="Increase heartbeat zoom">+</button>
                </div>
              </div>
            </div>

            <div class="bb-gallery-panel is-active" data-gallery-mode="carousel">
              <div class="bb-gallery-stage" id="bbGalleryStage">
                <button class="bb-carousel-control bb-carousel-control--prev" id="bbPrevBtn" type="button" aria-label="Previous slide">
                  <span>◀</span>
                </button>
                <div class="bb-carousel" id="bbCarousel" aria-live="polite"></div>
                <div class="bb-immersive-hud" id="bbImmersiveHud" aria-hidden="true">
                  <p class="bb-immersive-hud__label" id="bbImmersiveLabel"></p>
                  <a id="bbImmersiveLink" href="#" target="_blank" rel="noreferrer">View inscription</a>
                  <button id="bbImmersiveClose" type="button">Close</button>
                </div>
                <button class="bb-carousel-control bb-carousel-control--next" id="bbNextBtn" type="button" aria-label="Next slide">
                  <span>▶</span>
                </button>
              </div>
              <div class="bb-gallery-meta" id="bbGalleryMeta"></div>
            </div>

            <div class="bb-gallery-panel" data-gallery-mode="heartbeat">
              <div class="bb-heartbeat-stage" id="bbHeartbeatStage">
                <div class="bb-heartbeat-track-wrap">
                  <div class="bb-heartbeat-track" id="bbHeartbeatTrack"></div>
                </div>
                <div class="bb-heartbeat-info" id="bbHeartbeatInfo"></div>
              </div>
            </div>
          </section>

          <section class="bb-view" data-view="diary">
            <div class="bb-scroll-view">
              <article class="bb-block">
                <h2>BEYOND</h2>
                <p class="bb-block__sub">Fragments and notes tied directly to the collection journey.</p>
                <pre class="bb-pre" id="bbDiaryFocused">Loading diary...</pre>
              </article>
            </div>
          </section>

          <section class="bb-view" data-view="lifecycle">
            <div class="bb-scroll-view">
              <article class="bb-block">
                <h2>Lifecycle</h2>
                <p class="bb-block__sub">OPEN, SEALED, EXPIRED, and structural signals of the collection.</p>
                <div class="bb-about-rich" id="bbAboutFaq">Loading project description...</div>
              </article>
            </div>
          </section>
        </section>
      </main>
    </div>
  `},ne=a=>{const t=document.querySelector(".bb-intro__logo"),r=document.querySelector(".bb-menu__mark");!t||!r||(t.src=a,r.src=a,t.classList.add("bb-intro__logo--uploaded"),r.classList.add("bb-menu__mark--uploaded"))},oe=a=>{if(!a)return;const t=new Image;t.crossOrigin="anonymous",t.decoding="async",t.src=a,t.onload=()=>{const s=document.createElement("canvas");s.width=64,s.height=64;const n=s.getContext("2d",{willReadFrequently:!0});if(!n)return;n.fillStyle="#000",n.fillRect(0,0,64,64),n.drawImage(t,0,0,64,64);const d=n.getImageData(0,0,64,64),b=d.data;for(let i=0;i<b.length;i+=4)b[i]=255-b[i],b[i+1]=255-b[i+1],b[i+2]=255-b[i+2];n.putImageData(d,0,0);const g=s.toDataURL("image/png");document.querySelectorAll('link[rel="icon"], link[rel="alternate icon"]').forEach(i=>{i.setAttribute("href",g),i.setAttribute("type","image/png")})}},ie=async a=>{const t=[a,"/assets/logo/bb-uploaded-logo.png","/assets/logo/bb-uploaded-logo.jpeg","/assets/logo/bb-uploaded-logo.jpg","/assets/logo/bb-uploaded-logo.webp"].filter(Boolean);for(const r of t)try{if((await fetch(r,{method:"HEAD"})).ok)return r}catch{}return null},le=()=>{const a=document.querySelector("#bbIntro"),t=document.querySelector("#bbEnterButton"),r=document.querySelector(".bb-intro__logo"),s=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let n=null;const d=()=>{document.body.classList.contains("bb-intro-exit")||(n&&(window.clearTimeout(n),n=null),window.requestAnimationFrame(()=>{document.body.classList.add("bb-intro-exit")}),window.setTimeout(()=>{document.body.classList.add("bb-intro-complete"),a.setAttribute("hidden",""),m()},Q))};if(t.addEventListener("click",d),s){d();return}const b=()=>{document.body.classList.contains("bb-intro-exit")||(n=window.setTimeout(d,K))};r?.complete?b():r?(r.addEventListener("load",b,{once:!0}),r.addEventListener("error",b,{once:!0})):b()},D=()=>{const a=document.querySelector("#bbHeartbeatZoomWrap");if(!a)return;const t=e.activeView==="gallery"&&e.galleryMode==="heartbeat";a.classList.toggle("is-visible",t),a.hidden=!t,a.setAttribute("aria-hidden",String(!t))},z=()=>window.matchMedia("(max-width: 760px)").matches?te:ee,X=()=>{const a=document.querySelector("#bbHeartbeatZoomLevel"),t=document.querySelector("#bbHeartbeatZoomOut"),r=document.querySelector("#bbHeartbeatZoomIn");a&&(a.textContent=`${e.heartbeat.zoomLevel+1} / ${z().length}`),t&&(t.disabled=e.heartbeat.zoomLevel<=0),r&&(r.disabled=e.heartbeat.zoomLevel>=z().length-1)},P=a=>{e.activeView=a,a!=="gallery"&&e.carousel.immersive&&M(!1),document.querySelectorAll(".bb-menu__item").forEach(t=>{t.classList.toggle("is-active",t.dataset.view===a)}),document.querySelectorAll(".bb-view").forEach(t=>{t.classList.toggle("is-active",t.dataset.view===a)}),D(),m()},j=a=>{a!=="carousel"&&e.carousel.immersive&&M(!1),e.galleryMode=a,document.querySelectorAll(".bb-mode-btn").forEach(t=>{t.classList.toggle("is-active",t.dataset.mode===a)}),document.querySelectorAll(".bb-gallery-panel").forEach(t=>{t.classList.toggle("is-active",t.dataset.galleryMode===a)}),D(),a==="carousel"&&x(),a==="heartbeat"&&T({centerBehavior:e.heartbeat.initialized?"smooth":"auto"}),m()},ce=()=>{document.querySelectorAll(".bb-menu__item").forEach(s=>{s.addEventListener("click",()=>{P(s.dataset.view)})}),document.querySelector("#bbBrandButton").addEventListener("click",()=>{P("gallery")}),document.querySelectorAll(".bb-mode-btn").forEach(s=>{s.addEventListener("click",()=>{j(s.dataset.mode)})});const a=document.querySelector("#bbHeartbeatZoomOut"),t=document.querySelector("#bbHeartbeatZoomIn"),r=s=>{N(e.heartbeat.zoomLevel+s,{rerender:e.galleryMode==="heartbeat"})};a?.addEventListener("click",()=>{r(-1)}),t?.addEventListener("click",()=>{r(1)}),D(),X()},de=()=>{const a=document.querySelector("#bbMenuStats");if(!a)return;const t=e.summary,r=t?.totals?.total??e.items.length,s=t?.totals?.open??H(e.items,"open"),n=t?.totals?.sealed??H(e.items,"sealed"),d=t?.totals?.expired??H(e.items,"expired");a.innerHTML=`
    <span>${I.format(r)} TOTAL</span>
    <span>${I.format(s)} OPEN</span>
    <span>${I.format(n)} SEALED</span>
    <span>${I.format(d)} EXPIRED</span>
  `},be=a=>{const t=document.querySelector("#bbDiaryFocused");t&&(t.textContent=a||"No diary text available.")},ue=a=>S(a).replace(/(https?:\/\/[^\s<]+)/g,'<a href="$1" target="_blank" rel="noreferrer">$1</a>'),C=a=>ue(a).replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br />"),me=a=>{const t=document.querySelector("#bbAboutFaq");if(!t)return;if(!a){t.textContent="Project description unavailable.";return}const r=e.storyAssets||{},s=a.replace(/\r/g,"").trim(),n=s.search(/^What['’]s the total supply\?/im),d=n>=0?s.slice(0,n).trim():s,b=n>=0?s.slice(n).trim():"",g=r.lifecycle?`
      <figure class="bb-about-media bb-about-media--lifecycle-top">
        <img src="${r.lifecycle}" alt="BEST BEFORE lifecycle visual" loading="lazy" decoding="async" />
      </figure>
    `:"",v=r.aboutIntro?`
      <figure class="bb-about-media bb-about-media--intro-inline">
        <img src="${r.aboutIntro}" alt="BEST BEFORE intro visual" loading="lazy" decoding="async" />
      </figure>
    `:"",i=d.split(/\n{2,}/).map(o=>o.trim()).filter(Boolean);let u=!1;const c=i.map(o=>{const p=o.replaceAll("’","'").trim();if(/^(Best Before|How it works|The collector's role|About the artists|Lemonhaze|ORDINALLY)$/i.test(p))return`<h3 class="bb-about-heading">${S(o)}</h3>`;const L=`<p>${C(o)}</p>`;return!u&&/Rare immortals\./i.test(p)?(u=!0,`${L}${v}`):L}).join(`
`),h=b.split(/\n/).map(o=>o.trim()).filter(Boolean),y=[];let f=null;h.forEach(o=>{if(/\?$/.test(o)){f&&y.push(f),f={question:o,answerLines:[]};return}f&&f.answerLines.push(o)}),f&&y.push(f);const l=y.length?`
      <section class="bb-faq">
        <h3 class="bb-about-heading bb-about-heading--faq">FAQ</h3>
        <div class="bb-faq__list">
          ${y.map(o=>`
                <article class="bb-faq__item">
                  <h4 class="bb-faq__q">${S(o.question)}</h4>
                  <p class="bb-faq__a">${o.answerLines.map(p=>C(p)).join("<br />")}</p>
                </article>
              `).join("")}
        </div>
      </section>
    `:"";t.innerHTML=`${g}${c}${u?"":v}${l}`},ge=a=>{const t=document.querySelector("#bbHeartbeatStage");if(!t)return;const r=Math.min(1.9,Math.max(.72,Number(a)||1)),s=window.matchMedia("(max-width: 760px)").matches,n=Math.round(68*r),d=Math.max(7,Math.round(14-(r-1)*8)),b=s?1.46:1.72,g=Math.round(n*1.08);t.style.setProperty("--hb-thumb-size",`${n}px`),t.style.setProperty("--hb-gap",`${d}px`),t.style.setProperty("--hb-active-scale",String(b)),t.style.setProperty("--hb-center-pad",`${g}px`)},N=(a,t={})=>{const{rerender:r=!1,centerBehavior:s="auto"}=t,n=z(),d=n.length-1,b=Math.min(d,Math.max(0,Number(a)||0));e.heartbeat.zoomLevel=b,ge(n[b]),X(),r&&T({centerBehavior:s})},fe=()=>{},pe=()=>{const a=document.querySelector("#bbCarousel");if(a){if(e.carousel.items.length===0){a.innerHTML='<p class="bb-carousel-empty">No preview items found.</p>';return}a.innerHTML=e.carousel.items.map((t,r)=>`
        <article class="bb-slide ${R[t.status]||""}" data-index="${r}" aria-label="${S(t.name)}">
          <img data-src="${t.preview}" data-ordinals="${t.ordinalsUrl||""}" alt="${S(t.name)}" loading="lazy" decoding="async" />
        </article>
      `).join(""),a.querySelectorAll(".bb-slide").forEach(t=>{t.addEventListener("click",()=>{if(e.carousel.dragging)return;const r=Number.parseInt(t.dataset.index,10);e.carousel.index=r,e.carousel.dragOffset=0,e.carousel.pendingDragOffset=0,M(!0),x(),m()})})}},Y=()=>{const a=document.querySelector("#bbImmersiveHud"),t=document.querySelector("#bbImmersiveLabel"),r=document.querySelector("#bbImmersiveLink");if(!a||!t||!r)return;if(!e.carousel.immersive||e.carousel.items.length===0){a.classList.remove("is-active"),a.setAttribute("aria-hidden","true");return}const s=e.carousel.items[e.carousel.index];t.textContent=`${s.name} • ${B(s.number)}`,s.ordinalsUrl?(r.href=s.ordinalsUrl,r.classList.remove("is-hidden")):(r.removeAttribute("href"),r.classList.add("is-hidden")),a.classList.add("is-active"),a.setAttribute("aria-hidden","false")},M=a=>{e.carousel.immersive!==a&&(e.carousel.immersive=a,document.querySelector(".bb-root")?.classList.toggle("is-carousel-immersive",a),x(),Y())},he=()=>{const a=document.querySelector("#bbGalleryMeta");if(e.carousel.items.length===0){a.innerHTML="<p>Carousel unavailable.</p>";return}const t=e.carousel.items[e.carousel.index],r=e.carousel.index+1,s=e.carousel.items.length;a.innerHTML=`
    <div class="bb-gallery-meta__left">
      <p class="bb-gallery-meta__eyebrow">${r} / ${s}</p>
      <h2>${S(t.name)}</h2>
      <p>${S(B(t.number))} • <span class="${R[t.status]||""}">${S(U[t.status]||t.status)}</span></p>
      <p>${S(t.dimensions||"9:16")}</p>
    </div>
    <div class="bb-gallery-meta__right">
      ${t.ordinalsUrl?`<a href="${t.ordinalsUrl}" target="_blank" rel="noreferrer">View inscription</a>`:"<span>Sealed</span>"}
    </div>
  `},x=()=>{const a=document.querySelector("#bbGalleryStage"),t=document.querySelectorAll(".bb-slide"),r=e.carousel.items.length;if(!a||r===0)return;const s=a.clientWidth,n=t[0],d=n?n.offsetWidth:Math.min(350,Math.max(220,s*.22)),g=Math.max(240,s/2-d/2-10),v=s>=980;let i=Math.max(248,d*1.06+20),u=Math.max(i+124,i*1.2);i=Math.min(i,g*.74),u=Math.min(u,Math.max(i+96,g+8)),v&&(u=Math.max(u,g+56)),u<i+72&&(u=Math.min(Math.max(i+96,g+8),i+72));const c=e.carousel.dragOffset;t.forEach((h,y)=>{const f=ae(y,e.carousel.index,r),l=Math.abs(f),o=h.querySelector("img");o&&l<=3&&!e.carousel.loadedIndexes.has(y)&&(o.src=o.dataset.src,o.decoding="async",e.carousel.loadedIndexes.add(y)),o&&(f===0||e.carousel.immersive?(o.loading="eager",o.fetchPriority="high"):(o.loading="lazy",o.fetchPriority="auto"));let p="translate3d(-50%, -50%, -760px) scale(0.52)",_=0,L=1,w=.22,E="none";if(e.carousel.immersive?f===0?(p="translate3d(-50%, -50%, 0px) scale(1.28)",_=1,L=60,w=1,E="auto"):(p="translate3d(-50%, -50%, -320px) scale(0.8)",_=0,L=1,w=0):f===0?(p=`translate3d(calc(-50% + ${c}px), -50%, 0px) scale(1.02)`,_=1,L=40,w=1,E="auto"):f===-1?(p=`translate3d(calc(-50% - ${i-c*.18}px), -50%, -150px) scale(0.8) rotateY(5deg)`,_=.78,L=24,w=.84,E="auto"):f===1?(p=`translate3d(calc(-50% + ${i+c*.18}px), -50%, -150px) scale(0.8) rotateY(-5deg)`,_=.78,L=24,w=.84,E="auto"):f===-2?(p=`translate3d(calc(-50% - ${u-c*.05}px), -50%, -280px) scale(0.46) rotateY(1.5deg)`,_=.36,L=12,w=.48):f===2?(p=`translate3d(calc(-50% + ${u+c*.05}px), -50%, -280px) scale(0.46) rotateY(-1.5deg)`,_=.36,L=12,w=.48):(p="translate3d(-50%, -50%, -760px) scale(0.4)",_=0,L=1,w=0,E="none"),h.style.transform=p,h.style.opacity=String(_),h.style.zIndex=String(L),h.style.filter="none",h.style.pointerEvents=E,h.classList.toggle("is-focus",f===0),h.style.transition=e.carousel.dragging?"none":"transform 720ms cubic-bezier(0.18, 0.76, 0.24, 1), opacity 540ms ease",o){const $=o.dataset.src,q=o.dataset.ordinals;e.carousel.immersive&&f===0&&q?o.src=q:$&&(o.src=$),o.style.opacity=String(w),o.style.transition=e.carousel.dragging?"none":"opacity 420ms ease, filter 420ms ease"}}),he(),Y()},V=a=>{const t=e.carousel.items.length;t!==0&&(e.carousel.index=(a%t+t)%t,e.carousel.dragOffset=0,e.carousel.pendingDragOffset=0,x())},A=()=>{V(e.carousel.index+1)},k=()=>{V(e.carousel.index-1)},O=a=>{const t=e.heartbeat.items.length;if(t===0)return;const r=(a%t+t)%t;r===e.heartbeat.index&&e.heartbeat.initialized||(e.heartbeat.index=r,T())},W=()=>{O(e.heartbeat.index+1)},G=()=>{O(e.heartbeat.index-1)},ve=(a,t="smooth")=>{const r=document.querySelector(".bb-heartbeat-track-wrap");if(!r||!a)return;const s=a.offsetLeft+a.offsetWidth/2-r.clientWidth/2;r.scrollTo({left:s,behavior:t})},T=({rebuild:a=!1,centerBehavior:t}={})=>{const r=document.querySelector("#bbHeartbeatTrack"),s=document.querySelector("#bbHeartbeatInfo");if(!r||!s)return;if(e.heartbeat.items.length===0){r.innerHTML='<p class="bb-heartbeat-empty">No active pieces available for heartbeat mode.</p>',r.dataset.signature="",s.innerHTML="";return}const n=`${e.heartbeat.items.length}:${e.heartbeat.items[0]?.number??"na"}:${e.heartbeat.items[e.heartbeat.items.length-1]?.number??"na"}`;if(a||r.dataset.signature!==n){const v=[];for(let i=0;i<3;i+=1)e.heartbeat.items.forEach((u,c)=>{v.push({item:u,index:c,repeat:i})});r.innerHTML=v.map(({item:i,index:u,repeat:c})=>{const h=u===e.heartbeat.index&&c===1?"is-active":"",y=u%5===0||h;return`
          <button class="bb-heartbeat-node ${h}" data-index="${u}" data-repeat="${c}" type="button">
            <span class="bb-heartbeat-node__thumb">
              <img src="${i.preview}" alt="${S(i.name)}" loading="lazy" decoding="async" />
            </span>
            <span class="bb-heartbeat-node__label ${y?"is-visible":""}">BB ${i.number}</span>
          </button>
        `}).join(""),r.dataset.signature=n,e.heartbeat.initialized=!1,r.querySelectorAll(".bb-heartbeat-node").forEach(i=>{i.addEventListener("click",()=>{if(e.heartbeat.dragging)return;const u=Number.parseInt(i.dataset.index,10);O(u),m()})})}let b=null;if(r.querySelectorAll(".bb-heartbeat-node").forEach(v=>{const i=Number.parseInt(v.dataset.index,10),u=Number.parseInt(v.dataset.repeat,10),c=i===e.heartbeat.index&&u===1,h=v.querySelector(".bb-heartbeat-node__label"),y=i%5===0||c;v.classList.toggle("is-active",c),h?.classList.toggle("is-visible",y),c&&(b=v)}),b&&!e.heartbeat.dragging){const v=t??(e.heartbeat.initialized?"smooth":"auto");ve(b,v),e.heartbeat.initialized=!0}const g=e.heartbeat.items[e.heartbeat.index];s.innerHTML=`
    <div class="bb-heartbeat-info__meta">
      <p class="bb-heartbeat-info__eyebrow">ROADMAP PULSE • ${e.heartbeat.index+1}/${e.heartbeat.items.length}</p>
      <h3 class="bb-heartbeat-info__title">${S(g.name)}</h3>
      <p class="bb-heartbeat-info__text">
        <span>${S(B(g.number))}</span>
        <span class="${R[g.status]||""}">${S(U[g.status]||g.status)}</span>
        <span>${S(g.dimensions||"9:16")}</span>
      </p>
    </div>
    <div class="bb-heartbeat-info__actions">
      <button type="button" data-hb-action="prev">Prev</button>
      <button type="button" data-hb-action="next">Next</button>
      ${g.ordinalsUrl?`<a href="${g.ordinalsUrl}" target="_blank" rel="noreferrer">View inscription</a>`:"<span>Sealed</span>"}
    </div>
  `,s.querySelector('[data-hb-action="prev"]').addEventListener("click",()=>{G(),m()}),s.querySelector('[data-hb-action="next"]').addEventListener("click",()=>{W(),m()})},m=()=>{if(re(),!!document.body.classList.contains("bb-intro-complete")&&e.activeView==="gallery"){if(e.galleryMode==="carousel"){if(e.carousel.immersive)return;e.carousel.items.length>1&&!e.carousel.hovering&&!e.carousel.dragging&&(e.carousel.timer=window.setInterval(()=>{A()},4600));return}e.galleryMode==="heartbeat"&&(e.heartbeat.timer=null)}},ye=()=>{const a=document.querySelector("#bbGalleryStage"),t=document.querySelector("#bbPrevBtn"),r=document.querySelector("#bbNextBtn"),s=document.querySelector("#bbImmersiveClose");let n=null;const d=()=>{a&&(a.classList.add("is-controls-visible"),n&&window.clearTimeout(n),n=window.setTimeout(()=>{a.classList.remove("is-controls-visible"),n=null},1200))},b=l=>{l.stopPropagation(),k(),m()},g=l=>{l.stopPropagation(),A(),m()},v=()=>{e.carousel.dragRaf=null,!(e.galleryMode!=="carousel"||!e.carousel.dragging)&&(e.carousel.dragOffset=e.carousel.pendingDragOffset,x())};t.addEventListener("pointerdown",l=>l.stopPropagation()),r.addEventListener("pointerdown",l=>l.stopPropagation()),t.addEventListener("click",b),r.addEventListener("click",g),s?.addEventListener("click",l=>{l.stopPropagation(),M(!1),m()}),a.addEventListener("mouseenter",()=>{e.carousel.hovering=!0,m()}),a.addEventListener("mouseleave",()=>{e.carousel.hovering=!1,m()}),a.addEventListener("pointerdown",l=>{e.galleryMode==="carousel"&&(l.target.closest(".bb-carousel-control")||l.target.closest(".bb-immersive-hud")||l.pointerType==="mouse"&&l.button!==0||(e.carousel.dragging=!0,d(),e.carousel.dragStartX=l.clientX,e.carousel.dragOffset=0,e.carousel.pendingDragOffset=0,e.carousel.dragRaf&&(window.cancelAnimationFrame(e.carousel.dragRaf),e.carousel.dragRaf=null),a.setPointerCapture(l.pointerId),m()))}),a.addEventListener("click",l=>{e.carousel.immersive&&(l.target.closest(".bb-slide")||l.target.closest(".bb-immersive-hud")||(M(!1),m()))}),a.addEventListener("pointermove",l=>{e.galleryMode!=="carousel"||!e.carousel.dragging||(e.carousel.pendingDragOffset=l.clientX-e.carousel.dragStartX,e.carousel.dragRaf||(e.carousel.dragRaf=window.requestAnimationFrame(v)))});const i=l=>{if(!e.carousel.dragging)return;const o=80,p=e.carousel.pendingDragOffset;e.carousel.dragRaf&&(window.cancelAnimationFrame(e.carousel.dragRaf),e.carousel.dragRaf=null),e.carousel.dragging=!1,e.carousel.dragOffset=0,e.carousel.pendingDragOffset=0,p<=-o?A():p>=o?k():x();try{a.releasePointerCapture(l.pointerId)}catch{}m()};a.addEventListener("pointerup",i),a.addEventListener("pointercancel",i),a.addEventListener("touchstart",()=>{e.galleryMode==="carousel"&&d()});const u=document.querySelector("#bbHeartbeatStage"),c=document.querySelector(".bb-heartbeat-track-wrap"),h=document.querySelector("#bbHeartbeatTrack"),y=()=>{if(!c||!h||e.heartbeat.items.length===0)return;const l=[...h.querySelectorAll(".bb-heartbeat-node")];if(l.length===0)return;const o=c.getBoundingClientRect(),p=o.left+o.width/2;let _=e.heartbeat.index,L=Number.POSITIVE_INFINITY;l.forEach(w=>{const E=w.getBoundingClientRect(),$=E.left+E.width/2,q=Math.abs($-p);q<L&&(L=q,_=Number.parseInt(w.dataset.index,10))}),O(_),m()},f=()=>{e.heartbeat.settleTimer&&window.clearTimeout(e.heartbeat.settleTimer),e.heartbeat.settleTimer=window.setTimeout(()=>{e.heartbeat.settleTimer=null,!e.heartbeat.dragging&&e.galleryMode==="heartbeat"&&y()},120)};if(u.addEventListener("mouseenter",()=>{e.heartbeat.hovering=!0,m()}),u.addEventListener("mouseleave",()=>{e.heartbeat.hovering=!1,m()}),c){c.addEventListener("pointerdown",o=>{e.galleryMode==="heartbeat"&&(o.pointerType==="mouse"&&o.button!==0||(e.heartbeat.dragging=!0,e.heartbeat.dragStartX=o.clientX,e.heartbeat.dragStartScrollLeft=c.scrollLeft,c.classList.add("is-dragging"),c.setPointerCapture(o.pointerId),m()))}),c.addEventListener("pointermove",o=>{if(e.galleryMode!=="heartbeat"||!e.heartbeat.dragging)return;const p=o.clientX-e.heartbeat.dragStartX;c.scrollLeft=e.heartbeat.dragStartScrollLeft-p,f()});const l=o=>{if(e.heartbeat.dragging){e.heartbeat.dragging=!1,c.classList.remove("is-dragging");try{c.releasePointerCapture(o.pointerId)}catch{}y()}};c.addEventListener("pointerup",l),c.addEventListener("pointercancel",l),c.addEventListener("scroll",()=>{const o=h?h.scrollWidth/3:0;o>0&&(c.scrollLeft<o*.4?c.scrollLeft+=o:c.scrollLeft>o*1.6&&(c.scrollLeft-=o)),f()},{passive:!0})}window.addEventListener("keydown",l=>{if(l.key==="Escape"&&e.carousel.immersive){M(!1),m();return}e.activeView==="gallery"&&(l.key==="ArrowLeft"&&(e.galleryMode==="carousel"?k():G(),m()),l.key==="ArrowRight"&&(e.galleryMode==="carousel"?A():W(),m()))}),window.addEventListener("resize",()=>{N(e.heartbeat.zoomLevel,{rerender:!1}),x(),T({centerBehavior:"auto"})})},Le=()=>{const a=e.items.filter(r=>r.status==="open"&&r.preview).sort((r,s)=>r.number===null&&s.number===null?0:r.number===null?1:s.number===null?-1:r.number-s.number);e.carousel.items=a,e.carousel.index=0,e.carousel.dragOffset=0,e.carousel.pendingDragOffset=0,e.carousel.loadedIndexes=new Set,e.carousel.immersive=!1,document.querySelector(".bb-root")?.classList.remove("is-carousel-immersive");const t=e.items.filter(r=>r.preview).sort((r,s)=>r.number===null&&s.number===null?0:r.number===null?1:s.number===null?-1:r.number-s.number);e.heartbeat.items=t,e.heartbeat.index=t.length?Math.floor(Math.random()*t.length):0,e.heartbeat.dragging=!1,e.heartbeat.dragStartX=0,e.heartbeat.dragStartScrollLeft=0,e.heartbeat.initialized=!1,e.heartbeat.settleTimer&&(window.clearTimeout(e.heartbeat.settleTimer),e.heartbeat.settleTimer=null),pe(),N(e.heartbeat.zoomLevel),x(),T({rebuild:!0,centerBehavior:"auto"}),ye(),j(e.galleryMode),m()},F=async a=>{const t=await fetch(a);if(!t.ok)throw new Error(`Failed loading ${a}`);return t.json()},Z=async a=>{const t=await fetch(a);if(!t.ok)throw new Error(`Failed loading ${a}`);return t.text()},Se=a=>{const t=document.querySelector("#bbMenuStats");t&&(t.innerHTML=`<span>${S(a)}</span>`)},_e=async()=>{se(),le(),ce();try{const[a,t,r,s]=await Promise.all([F("/data/best-before-summary.json"),F("/data/best-before-items.json"),Z("/data/bb-diary-best-before.txt"),Z("/data/bb-about-faq.txt")]);e.summary=a,e.items=t,e.aboutFaq=s,e.storyAssets=a?.storyAssets||{};const n=await ie(a?.logoAsset);n&&(ne(n),oe(n)),de(),be(r),me(s),fe(),Le()}catch(a){Se(`Data load issue: ${a.message}`)}};_e();
