import { buildBestBeforeDocument } from './best-before-player.js';

// A display-only version of the original renderer. The outer viewport is the
// physical frame: only the artwork fits inside it, never the inscription UI.
export function createLiveStudies(getItems) {
  const entries = new Map();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let suspended = false;
  function finishExpanded(entry) {
    if(!entry.expanded)return;
    entry.expanded=false;entry.container.classList.remove('is-study-expanded');
    entry.container.removeAttribute('role');entry.container.removeAttribute('aria-modal');entry.container.removeAttribute('aria-label');
    document.documentElement.classList.remove('study-fullscreen');
    entry.expand.innerHTML=entry.expandLabel;entry.expand.setAttribute('aria-expanded','false');
    entry.expand.setAttribute('aria-label','View live exhibition full screen');
    if(entry.root.isConnected&&!entry.root.closest('[hidden]')){
      window.scrollTo(entry.scrollX,entry.scrollY);entry.expand.focus({preventScroll:true});
    }
  }
  async function toggleExpanded(entry) {
    if(entry.expanded){
      if(document.fullscreenElement===entry.container)await document.exitFullscreen();
      finishExpanded(entry);return;
    }
    entry.scrollX=window.scrollX;entry.scrollY=window.scrollY;entry.expanded=true;
    entry.expand.textContent='Return to study ×';entry.expand.setAttribute('aria-expanded','true');
    entry.expand.setAttribute('aria-label','Exit full screen exhibition');
    entry.container.setAttribute('role','dialog');entry.container.setAttribute('aria-modal','true');
    entry.container.setAttribute('aria-label',`Live exhibition of BEST BEFORE Nº${entry.root.dataset.liveStudy}`);
    entry.paused=false;update(entry);
    try{if(!entry.container.requestFullscreen)throw Error('Unsupported');await entry.container.requestFullscreen();}
    catch{entry.container.classList.add('is-study-expanded');document.documentElement.classList.add('study-fullscreen');}
    entry.expand.focus({preventScroll:true});
  }
  const fullscreenChange=()=>entries.forEach(entry=>{
    if(entry.expanded&&!entry.container.classList.contains('is-study-expanded')&&document.fullscreenElement!==entry.container)finishExpanded(entry);
  });
  const fullscreenKeys=event=>{
    const entry=[...entries.values()].find(e=>e.expanded);if(!entry)return;
    if(event.key==='Escape'){event.preventDefault();void toggleExpanded(entry);}
    if(event.key==='Tab'){
      event.preventDefault();(document.activeElement===entry.button?entry.expand:entry.button).focus();
    }
  };
  document.addEventListener('fullscreenchange',fullscreenChange);
  document.addEventListener('keydown',fullscreenKeys);
  function stop(entry) {
    entry.abort?.abort();entry.abort=null;
    entry.resize?.disconnect();entry.resize=null;
    if(entry.receive)window.removeEventListener('message',entry.receive);
    entry.receive=null;
    entry.frame?.remove();entry.frame=null;
    entry.root.classList.remove('is-live','is-loading','is-ready');
  }
  function start(entry) {
    const item=getItems().find(i=>i.number===Number(entry.root.dataset.liveStudy));
    if(!item||entry.frame)return;
    const frame=document.createElement('iframe');
    frame.title=`BEST BEFORE Nº${item.number} — live exhibition study`;
    frame.setAttribute('sandbox','allow-scripts');
    frame.setAttribute('aria-hidden','true');
    frame.tabIndex=-1;
    const abort=new AbortController(),token=crypto.randomUUID();
    entry.frame=frame;entry.abort=abort;
    entry.root.classList.add('is-loading');entry.root.append(frame);
    const fit=()=>{
      const box=entry.root.getBoundingClientRect(),style=getComputedStyle(entry.root);
      const w=box.width-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth);
      const h=box.height-parseFloat(style.borderTopWidth)-parseFloat(style.borderBottomWidth);
      const scale=Math.max(w/900,h/1600);
      frame.style.transform=`translate(-50%,-50%) scale(${scale})`;
    };
    entry.resize=new ResizeObserver(fit);entry.resize.observe(entry.root);fit();
    entry.receive=event=>{
      if(event.source!==frame.contentWindow||event.data?.channel!=='best-before-player-v1'||event.data?.token!==token)return;
      if(['drawing','ready'].includes(event.data.type)){
        entry.root.classList.add('is-live');entry.root.classList.remove('is-loading');
        if(event.data.type==='ready')entry.root.classList.add('is-ready');
      }
    };
    window.addEventListener('message',entry.receive);
    fetch(`https://ordinals.com/content/${item.id}`,{signal:abort.signal}).then(async response=>{
      if(!response.ok)throw Error('Artwork unavailable');
      const source=await response.text();
      if(entry.frame===frame&&!abort.signal.aborted){
        // The wall display contains the painting alone, including while it draws.
        // Keep the inscription's loading HUD out of this display-only study.
        frame.srcdoc=buildBestBeforeDocument(source,item.id,token).replace('</head>',
          '<style>#artwork-wrapper > :not(canvas){display:none!important}</style></head>');
      }
    }).catch(error=>{
      if(error.name==='AbortError'||entry.frame!==frame)return;
      stop(entry);entry.paused=true;
      entry.button.textContent='Retry live artwork';
      entry.button.setAttribute('aria-pressed','false');
    });
  }
  function update(entry) {
    const active=entry.visible&&!entry.paused&&!suspended&&!document.hidden;
    if(active)start(entry);else stop(entry);
    entry.button.textContent=entry.paused?'Play live artwork':'Pause live artwork';
    entry.button.setAttribute('aria-pressed',String(!entry.paused));
  }
  const observer=new IntersectionObserver(changes=>{
    for(const change of changes){const entry=entries.get(change.target);if(entry){entry.visible=change.isIntersecting;update(entry);}}
  },{threshold:0});
  function refresh() {
    for(const [root,entry] of entries){
      if(entry.expanded&&(!root.isConnected||root.closest('[hidden]'))){
        if(document.fullscreenElement===entry.container)void document.exitFullscreen();
        finishExpanded(entry);
      }
      if(!root.isConnected){stop(entry);observer.unobserve(root);entries.delete(root);}
    }
    document.querySelectorAll('[data-live-study]').forEach(root=>{
      if(entries.has(root))return;
      const container=root.closest('[data-study-container]'),button=container.querySelector('[data-study-toggle]'),expand=container.querySelector('[data-study-expand]');
      const entry={root,container,button,expand,expandLabel:expand.innerHTML,expanded:false,visible:false,paused:reducedMotion.matches,frame:null};
      entries.set(root,entry);
      button.addEventListener('click',()=>{entry.paused=!entry.paused;update(entry);});
      expand.addEventListener('click',()=>void toggleExpanded(entry));
      update(entry);observer.observe(root);
    });
  }
  const visibility=()=>entries.forEach(update);
  document.addEventListener('visibilitychange',visibility);
  return {refresh,setSuspended(value){if(suspended===value)return;suspended=value;entries.forEach(update);},destroy(){observer.disconnect();entries.forEach(entry=>{finishExpanded(entry);stop(entry);});entries.clear();document.removeEventListener('fullscreenchange',fullscreenChange);document.removeEventListener('keydown',fullscreenKeys);document.removeEventListener('visibilitychange',visibility);}};
}
