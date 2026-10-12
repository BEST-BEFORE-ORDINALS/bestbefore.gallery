// Keep legacy path parsing available for older integrations and links.
export { parseRoute, initRouting } from './legacy-router.js';
const valid=(value,options,fallback)=>options.includes(value)?value:fallback;
export function parseCollectionRoute(hash) {
  let [path,query='']=hash.replace(/^#/, '').split('?');
  path=path.replace(/\/$/,'')||'/';
  const diaryPart=/^\/diary\/([1-6])$/.exec(path);
  if(diaryPart)path='/diary';
  const params=new URLSearchParams(query);
  const work=/^\/work\/(\d+)$/.exec(path);
  const views=['artists','rooms','process','exhibition','canvas','diary','ledger','about','faq'];
  const view=valid(path.slice(1),views,'grid');
  return { view,
    work:work?Number(work[1]):null,
    status:valid(params.get('status'),['all','open','sealed','expired','immortal'],'all'),
    sort:valid(params.get('sort'),['number','time','palette'],'number'),
    arrange:valid(params.get('arrange'),['number','palette','lifespan'],'number'),
    ...(path==='/rooms'?{palette:params.get('palette')||''}:{}),
    ...(path==='/diary'?{part:Math.max(0,Math.min(6,parseInt(diaryPart?.[1]||params.get('part'),10)||0))}:{}) };
}
export function routeUrl(input) {
  const url=new URL(input.replace(/^#/,''),'https://bestbefore.gallery');
  let path=url.pathname.replace(/\/$/,'')||'/';
  if(path==='/grid')path='/';
  if(/^\/\d+$/.test(path))path=`/work${path}`;
  if(path==='/diary'&&url.searchParams.has('part')){
    const part=Math.max(0,Math.min(6,parseInt(url.searchParams.get('part'),10)||0));
    path=part?`/diary/${part}`:'/diary';url.searchParams.delete('part');
  }
  return path+(url.searchParams.size?`?${url.searchParams}`:'');
}
export const currentRouteUrl=()=>routeUrl(location.hash.startsWith('#/')?location.hash:location.pathname+location.search);
export function initCollectionRouting({ render, open, close, metadata=()=>{} }) {
  let background=parseCollectionRoute(currentRouteUrl()).work?'/':currentRouteUrl();
  let applying=false;
  const initial=currentRouteUrl();
  if(location.hash.startsWith('#/')||initial!==location.pathname+location.search)history.replaceState(history.state,'',initial);
  const apply=()=>{
    applying=true;
    const url=currentRouteUrl(),route=parseCollectionRoute(url);
    if(route.work){render(parseCollectionRoute(background));open(route.work);}
    else{close();background=url;render(route);}
    metadata(route);
    applying=false;
  };
  const navigate=(url,{replace=false}={})=>{history[replace?'replaceState':'pushState']({},'',routeUrl(url));apply();};
  const openWork=(number,{replace=false}={})=>{
    if(!parseCollectionRoute(currentRouteUrl()).work)background=currentRouteUrl();
    history[replace?'replaceState':'pushState']({collectionReturn:background},'',`/work/${number}`);apply();
  };
  document.addEventListener('click',event=>{
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const anchor=event.target.closest('a[href]');
    if(!anchor||anchor.target||anchor.hasAttribute('download'))return;
    const href=anchor.getAttribute('href');if(href.startsWith('#')&&!href.startsWith('#/'))return;
    const url=new URL(anchor.href,location.href);
    if(url.origin!==location.origin)return;
    if(!/^\/(?:|grid|canvas|rooms|about|faq|artists|process|exhibition|ledger|diary(?:\/[1-6])?|work\/[1-9]\d{0,2})$/.test(url.pathname))return;
    event.preventDefault();navigate(url.pathname+url.search);
  });
  window.addEventListener('popstate',apply);
  window.addEventListener('hashchange',()=>{if(!applying){history.replaceState(history.state,'',currentRouteUrl());apply();}});
  window.addEventListener('bb:modal-close',()=>{
    if(applying||!parseCollectionRoute(currentRouteUrl()).work)return;
    if(history.state?.collectionReturn)history.back();else navigate(background,{replace:true});
  });
  apply();
  return {navigate,openWork,refresh:apply};
}
