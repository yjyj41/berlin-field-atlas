// Editorial groups for the existing 100 stops; galleries can also be museums.
export const categories=[['all','All'],['architecture','Architecture'],['artspaces','Art spaces'],['clubs','Clubs'],['museums','Museums'],['galleries','Galleries'],['culture','Culture'],['civic','Civic'],['sacred','Sacred'],['libraries','Libraries'],['living','Work & living'],['other','Other']];
const galleries=new Set(['berlin-neue-nationalgalerie','berlin-alte-nationalgalerie','berlin-gemldegalerie','berlin-berlinische-galerie','berlin-hamburger-bahnhof','berlin-museum-for-architectural-drawing','berlin-gropius-bau']);
export function categoriesFor(s){
 if(s.venue)return s.kind==='artspaces'?['artspaces','galleries']:['clubs'];
 const t=s.type||'',a=[];
 if(/Museum|Museum entrance|Exhibition space/.test(t)||s.id==='berlin-humboldt-forum')a.push('museums');
 if(galleries.has(s.id)||/Gallery/.test(t)||/Gemäldegalerie|Berlinische Galerie|Hamburger Bahnhof|Gropius Bau|Museum for Architectural Drawing/.test(s.name))a.push('galleries');
 if(/Concert|Cinema|Cultural|Performance|Opera|Theatre|Exhibition building/.test(t))a.push('culture');
 if(/Government|Parliament|Town hall|Embassy|Palace/.test(t))a.push('civic');
 if(/Church|Cathedral|Synagogue/.test(t))a.push('sacred');
 if(/Library|library|Archive/.test(t))a.push('libraries');
 if(/Office|office|Housing|Retail|Department|Hotel|hotel|Restaurant/.test(t))a.push('living');
 return ['architecture',...(a.length?a:['other'])];
}
const normal=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function matchingStops(stops,category='all',query=''){
 const q=normal(query.trim());return stops.filter(s=>(category==='all'||categoriesFor(s).includes(category))&&normal([s.name,s.architect,s.type,s.aliases,s.address,s.neighbourhood].join(' ')).includes(q));
}
