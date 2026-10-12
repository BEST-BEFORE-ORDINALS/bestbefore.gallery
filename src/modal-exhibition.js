// Reuse the current live iframe so entering the exhibition never restarts a work.
export function connectModalExhibition(overlay) {
  const modal=overlay.querySelector('.bb-modal');
  const button=overlay.querySelector('[data-exhibition]');
  let expanded=false,returnFocus,ignoreEscapeUntil=0;
  function restore(){
    if(!expanded)return;
    expanded=false;ignoreEscapeUntil=performance.now()+350;modal.classList.remove('is-exhibition');
    overlay._artworkFrame?.setExhibition(false);
    button.textContent='Exhibition view';button.setAttribute('aria-expanded','false');
    returnFocus?.focus({preventScroll:true});
  }
  async function toggle(){
    if(expanded){
      if(document.fullscreenElement===modal)await document.exitFullscreen();
      restore();return;
    }
    returnFocus=document.activeElement;expanded=true;modal.classList.add('is-exhibition');
    overlay._artworkFrame?.setExhibition(true);
    button.textContent='Return to artwork';button.setAttribute('aria-expanded','true');
    try{await modal.requestFullscreen?.();}catch{/* CSS fills the viewport on mobile Safari. */}
    button.focus({preventScroll:true});
  }
  const fullscreen=()=>{if(!document.fullscreenElement)restore();};
  const key=event=>{
    if(event.key==='Escape'&&performance.now()<ignoreEscapeUntil){event.preventDefault();event.stopImmediatePropagation();return;}
    if(!expanded)return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();void toggle();}
    if(event.key==='Tab'){event.preventDefault();event.stopImmediatePropagation();button.focus();}
    if(['ArrowLeft','ArrowRight'].includes(event.key))event.stopImmediatePropagation();
  };
  button.addEventListener('click',toggle);
  document.addEventListener('fullscreenchange',fullscreen);
  document.addEventListener('keydown',key,true);
  return ()=>{
    if(document.fullscreenElement===modal)void document.exitFullscreen();
    document.removeEventListener('fullscreenchange',fullscreen);
    document.removeEventListener('keydown',key,true);
  };
}
