// Keep legacy path parsing available for older integrations and links.
export { parseRoute, initRouting } from './legacy-router.js';
const valid=(value,options,fallback)=>options.includes(value)?value:fallback;
export function parseCollectionRoute(hash) {
  const [path,query='']=hash.replace(/^#/, '').split('?');
  const params=new URLSearchParams(query);
  const work=/^\/work\/(\d+)$/.exec(path);
  return { view:path==='/artists'?'artists':path==='/rooms'?'rooms':path==='/process'?'process':path==='/exhibition'?'exhibition':path==='/canvas'?'canvas':path==='/diary'?'diary':path==='/ledger'?'ledger':path==='/about'?'about':'grid',
    work:work?Number(work[1]):null,
    status:valid(params.get('status'),['all','open','sealed','expired','immortal'],'all'),
    sort:valid(params.get('sort'),['number','time','palette'],'number'),
    arrange:valid(params.get('arrange'),['number','palette','lifespan'],'number'),
    ...(path==='/rooms'?{palette:params.get('palette')||''}:{}),
    ...(path==='/diary'?{part:Math.max(0,Math.min(6,parseInt(params.get('part'),10)||0))}:{}) };
}
export function initCollectionRouting({ render, open, close }) {
  let background=location.hash.startsWith('#/work/')?'#/grid':location.hash||'#/grid';
  let applying=false;
  if(!location.hash){const old=/^\/(\d+)$/.exec(location.pathname);const diary=/^\/diary(?:\/([1-6]))?$/.exec(location.pathname);history.replaceState({},'',`/${old?`#/work/${old[1]}`:diary?`#/diary${diary[1]?`?part=${diary[1]}`:''}`:location.pathname==='/artists'?'#/artists':'#/grid'}`);}
  const apply=()=>{
    applying=true;
    const route=parseCollectionRoute(location.hash);
    if(route.work){render(parseCollectionRoute(background));open(route.work);}
    else{close();background=location.hash||'#/grid';render(route);}
    applying=false;
  };
  const navigate=(hash,{replace=false}={})=>{history[replace?'replaceState':'pushState']({},'',hash);apply();};
  const openWork=(number,{replace=false}={})=>{
    if(!parseCollectionRoute(location.hash).work)background=location.hash||'#/grid';
    history[replace?'replaceState':'pushState']({collectionReturn:background},'',`#/work/${number}`);apply();
  };
  window.addEventListener('popstate',apply);
  window.addEventListener('hashchange',()=>{if(!applying)apply();});
  window.addEventListener('bb:modal-close',()=>{
    if(applying||!parseCollectionRoute(location.hash).work)return;
    if(history.state?.collectionReturn)history.back();else navigate(background,{replace:true});
  });
  apply();
  return {navigate,openWork,refresh:apply};
}
