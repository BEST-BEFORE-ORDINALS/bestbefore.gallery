import { thumbnail, phase, sortCollection, numberLabel, timeLeft } from './collection.js';
import { escapeHtml } from './state.js';
export const zoomAt = (camera, factor, x, y) => {
  const scale = Math.min(2.5, Math.max(.08, camera.scale * factor));
  return { x: x - (x-camera.x)*scale/camera.scale, y: y - (y-camera.y)*scale/camera.scale, scale };
};
export function createCanvas(root, open) {
  root.innerHTML = `<div class="board-world"></div><div class="board-controls"><button data-zoom="in" aria-label="Zoom in">+</button><button data-zoom="out" aria-label="Zoom out">−</button><button data-zoom="reset" aria-label="Reset canvas view">↺</button><output>55%</output></div><p class="board-hint">Drag to explore <span>·</span> Scroll to zoom <span>·</span> Arrow keys to pan</p><canvas class="board-map" width="200" height="130" aria-label="Collection overview"></canvas>`;
  const world = root.querySelector('.board-world'), map=root.querySelector('canvas'), ctx=map.getContext('2d');
  let camera = {x: 60,y: 45,scale: .65}, items=[], positions=[], active=false, raf=0, width=0,height=0, arranged='', selected;
  const nodes=new Map(), pointers=new Map(), keys=new Set();
  let gesture=null, dragged=false, start=null;
  const resize=new ResizeObserver(()=>{ width=root.clientWidth; height=root.clientHeight; schedule(); }); resize.observe(root);
  function schedule(){if(active&&!raf) raf=requestAnimationFrame(paint);}
  function paint(){
    raf=0;
    if(!active) return;
    if(keys.size){const speed=12; if(keys.has('ArrowLeft')||keys.has('a'))camera.x+=speed;if(keys.has('ArrowRight')||keys.has('d'))camera.x-=speed;if(keys.has('ArrowUp')||keys.has('w'))camera.y+=speed;if(keys.has('ArrowDown')||keys.has('s'))camera.y-=speed;}
    world.style.transform=`translate3d(${camera.x}px,${camera.y}px,0) scale(${camera.scale})`;
    root.style.backgroundPosition=`${camera.x}px ${camera.y}px`;
    root.querySelector('output').textContent=`${Math.round(camera.scale*100)}%`;
    const visible=new Set();
    for(const p of positions){
      const x=p.x*camera.scale+camera.x,y=p.y*camera.scale+camera.y;
      if(x>width+60||y>height+60||x+p.w*camera.scale < -60||y+(p.h+30)*camera.scale < -60)continue;
      visible.add(p.item.number);
      let node=nodes.get(p.item.number);
      if(!node){
        node=document.createElement('button');node.className='board-work';node.dataset.work=p.item.number;
        node.setAttribute('aria-label',`Nº${numberLabel(p.item.number)} · ${p.item.palette?.id||phase(p.item)}. Open BEST BEFORE ${p.item.number}`);node.title=`BEST BEFORE Nº${p.item.number} · ${p.item.palette?.id||phase(p.item)} · ${timeLeft(p.item)}`;
        node.innerHTML=`<div class="board-work__art"><img draggable="false" alt=""/><div class="board-swatch"></div></div><span>Nº${numberLabel(p.item.number)} · ${escapeHtml(p.item.palette?.id||phase(p.item))}</span>`;
        const colors=(p.item.palette?.colors||['#6a6a64']).filter(c=>/^#[0-9a-f]{3,8}$/i.test(c));
        node.querySelector('.board-swatch').style.background=`linear-gradient(90deg,${colors.length>1?colors.join(','):colors[0]+','+colors[0]})`;
        world.append(node);nodes.set(p.item.number,node);
      }
      node.style.transform=`translate(${p.x}px,${p.y}px)`;node.style.width=`${p.w}px`;node.querySelector('.board-work__art').style.height=`${p.h}px`;
      const pixelWidth=p.w*camera.scale;
      const tier=pixelWidth<50?0:pixelWidth<115?96:pixelWidth<230?200:pixelWidth<460?400:800;
      node.classList.toggle('is-tiny',!tier);
      if(tier&&node.dataset.tier!==String(tier)){node.querySelector('img').src=thumbnail(p.item,tier);node.dataset.tier=tier;}
    }
    for(const [id,node]of nodes)if(!visible.has(id)){node.remove();nodes.delete(id);}
    ctx.clearRect(0,0,200,130);
    const sx=200/7200,sy=130/14000;
    for(const p of positions){ctx.fillStyle=phase(p.item)==='open'?'#60d3ae':phase(p.item)==='immortal'?'#e8cb62':phase(p.item)==='expired'?'#765653':'#666861';ctx.fillRect(p.x*sx,p.y*sy,4,5);}
    ctx.strokeStyle='#e4eccb';ctx.lineWidth=1;ctx.strokeRect(-camera.x/camera.scale*sx,-camera.y/camera.scale*sy,width/camera.scale*sx,height/camera.scale*sy);
    if(keys.size)schedule();
  }
  function zoom(factor,x=width/2,y=height/2){camera=zoomAt(camera,factor,x,y);schedule();}
  root.addEventListener('wheel',e=>{e.preventDefault();const r=root.getBoundingClientRect();zoom(Math.exp(-Math.max(-180,Math.min(180,e.deltaY))*.003),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  root.addEventListener('pointerdown',e=>{
    if(e.target.closest('.board-controls')||e.button>0)return;
    const r=root.getBoundingClientRect();pointers.set(e.pointerId,{x:e.clientX-r.left,y:e.clientY-r.top});
    root.setPointerCapture(e.pointerId);start={x:e.clientX,y:e.clientY};dragged=false;selected=e.target.closest('[data-work]')?.dataset.work;
    gesture=null;root.classList.add('is-dragging');
  });
  root.addEventListener('pointermove',e=>{
    if(!pointers.has(e.pointerId))return;
    if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)dragged=true;
    const r=root.getBoundingClientRect(), previous=pointers.get(e.pointerId),next={x:e.clientX-r.left,y:e.clientY-r.top};pointers.set(e.pointerId,next);
    if(pointers.size===2){
      dragged=true;const[a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      if(gesture){camera=zoomAt(camera,distance/gesture.distance,gesture.center.x,gesture.center.y);camera.x+=center.x-gesture.center.x;camera.y+=center.y-gesture.center.y;}
      gesture={distance,center};
    }else{camera.x+=next.x-previous.x;camera.y+=next.y-previous.y;}
    schedule();
  });
  const end=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);gesture=null;if(!pointers.size){root.classList.remove('is-dragging');if(!dragged&&selected&&e.type==='pointerup')open(Number(selected));selected=null;}};
  root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);
  root.querySelector('.board-controls').addEventListener('click',e=>{const mode=e.target.dataset.zoom;if(mode==='reset'){camera={x:60,y:45,scale:.65};schedule();}else if(mode)zoom(mode==='in'?1.3:1/1.3);});
  root.addEventListener('keydown',e=>{if(!active||e.target.closest('select,input')||document.querySelector('.bb-modal-overlay'))return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','a','s','d'].includes(e.key)){e.preventDefault();keys.add(e.key);schedule();}});
  window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());root.addEventListener('focusout',()=>keys.clear());
  return {
    render(collection,arrange){
      items=sortCollection(collection,arrange);
      positions=items.map((item,i)=>{const w=180+(item.number*17%90),square=['sealed','expired'].includes(item.status);return {item,w,h:square?w:w*16/9,x:(arrange==='number'?i%20:Math.floor(i/20))*340+(item.number*13%55),y:(arrange==='number'?Math.floor(i/20):i%20)*650+(item.number*29%100)+55};});
      for(const node of nodes.values())node.remove();nodes.clear();
      if(arranged&&arranged!==arrange)camera={x:60,y:45,scale:.65};arranged=arrange;schedule();
    },
    setActive(value){active=value;keys.clear();if(value){width=root.clientWidth;height=root.clientHeight;schedule();}else{cancelAnimationFrame(raf);raf=0;}},
    getCamera:()=>({...camera}),
  };
}
