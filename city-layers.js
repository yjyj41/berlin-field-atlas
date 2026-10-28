import * as THREE from './vendor/three.module.js';
export const LAYERS_KEY='berlin-field-atlas.layers.v1';
export const defaultLayers={regions:true,transit:true,streets:true,parks:true,water:true,opacity:.5};
export function readLayers(storage){
 const v={...defaultLayers};try{const p=JSON.parse(storage().getItem(LAYERS_KEY));for(const k of ['regions','transit','streets','parks','water'])if(typeof p?.[k]==='boolean')v[k]=p[k];if(Number.isFinite(p?.opacity))v.opacity=Math.max(.15,Math.min(.8,p.opacity));}catch{}return v;
}
export function saveLayers(value,storage){try{storage().setItem(LAYERS_KEY,JSON.stringify(value));return true;}catch{return false;}}
export function createCityLayers(scene,data){
 // One small shared region raster tints ordinary masses without touching landmark finishes.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d'),[x0,y0,x1,y1]=data.bounds;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1024,1024);
 for(const r of data.regions){ctx.fillStyle=r.color;for(const rings of r.polygons){ctx.beginPath();for(const ring of rings){ring.forEach(([x,y],i)=>{const u=(x-x0)/(x1-x0)*1024,v=(y1-y)/(y1-y0)*1024;i?ctx.lineTo(u,v):ctx.moveTo(u,v);});ctx.closePath();}ctx.fill('evenodd');}}
 const regionTexture=new THREE.CanvasTexture(canvas);regionTexture.colorSpace=THREE.SRGBColorSpace;const strength={value:.32};
 const host=document.createElement('div');host.id='city-labels';host.setAttribute('aria-label','City orientation labels');document.querySelector('#markers').before(host);
 const railGroup=new THREE.Group();railGroup.name='transit-corridors';scene.add(railGroup);
 for(const mode of ['U','S'])for(const tunnel of [true,false]){
  const positions=[];for(const r of data.rails)if(r.mode===mode&&r.tunnel===tunnel)for(let i=1;i<r.points.length;i++)positions.push(...r.points[i-1],...r.points[i]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const props={color:mode==='U'?0x347cc4:0x20855b,transparent:true,opacity:.65,depthTest:false,depthWrite:false};
  const material=tunnel?new THREE.LineDashedMaterial({...props,dashSize:22,gapSize:10}):new THREE.LineBasicMaterial(props);
  const line=new THREE.LineSegments(geometry,material);line.computeLineDistances();line.renderOrder=10;railGroup.add(line);
 }
 const items=[];
 function label(info,kind,priority){
  const el=document.createElement(kind==='station'?'a':'span');el.className='city-label '+kind;el.hidden=true;
  if(kind==='station'){
   for(const mode of info.modes){const badge=document.createElement('b');badge.className='mode-'+mode;badge.textContent=mode;el.append(badge);}
   el.href='https://www.openstreetmap.org/node/'+info.sourceIds[0];el.target='_blank';el.rel='noopener noreferrer';el.title=info.name+' · '+info.modes.map(m=>m==='U'?'U-Bahn':'S-Bahn').join(' / ')+' · View station on OpenStreetMap';
  }
  const name=document.createElement('span');name.textContent=info.name;el.append(name);
  if(kind==='region'){el.style.setProperty('--region-color',info.color);el.title=info.name+' · mapped Ortsteil';}
  host.append(el);items.push({...info,kind,priority,el,width:Math.min(kind==='region'?240:230,info.name.length*(kind==='region'?8:6)+24+(info.modes?.length||0)*18)});
 }
 for(const r of data.regions)label(r,'region',0);
 for(const s of data.stations)label(s,'station',s.major?1:3);
 for(const s of data.labels)label(s,s.kind,2);
 for(const s of data.streets)if(!s.name.endsWith('platz'))label(s,'street',4);
 items.sort((a,b)=>a.priority-b.priority||(b.areaKm2||b.area||b.length||0)-(a.areaKm2||a.area||a.length||0));
 let state={...defaultLayers};const point=new THREE.Vector3();
 function visible(s,span){
  if(s.kind==='region')return state.regions&&(span>1500||s.areaKm2<1.5)&&s.areaKm2>span/18000;
  if(s.kind==='station')return state.transit&&(span<2500||s.major);
  if(s.kind==='street')return state.streets&&span<4500&&(span<1400||s.rank<3)&&s.length>span*.12;
  if(s.kind==='square')return state.streets&&span<3200;
  return state[s.kind==='park'?'parks':'water']&&(span<3000||s.area>200000);
 }
 function place(camera,w,h,span,occupied,side,bottom,regionsOnly=false){
  const counts={region:0,station:0,other:0};
  for(const s of items){const primary=s.kind==='region'||s.kind==='station'&&s.major;if(primary!==regionsOnly)continue;s.el.hidden=true;
   const bucket=s.kind==='region'?'region':primary?'station':'other',limit=bucket==='region'?12:bucket==='station'?7:24;
   if(!visible(s,span)||counts[bucket]>=limit)continue;
   point.set(...s.anchor).project(camera);const x=(point.x+1)*w/2,y=(1-point.y)*h/2,b=[x-s.width/2,y-13,x+s.width/2,y+13];
   if(point.z<-1||point.z>1||b[0]<14||b[2]>w-side-20||y<180||y>h-bottom-60||occupied.some(a=>b[0]<a[2]+8&&b[2]>a[0]-8&&b[1]<a[3]+8&&b[3]>a[1]-8))continue;
   s.el.hidden=false;s.el.style.left=x+'px';s.el.style.top=y+'px';occupied.push(b);counts[bucket]++;
  }
 }
 return {data,place,tintContext(material){material.onBeforeCompile=shader=>{
  shader.uniforms.atlasRegions={value:regionTexture};shader.uniforms.atlasRegionStrength=strength;
  shader.vertexShader='varying vec2 vAtlasRegion;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\nvAtlasRegion=(position.xy-vec2(${x0.toFixed(1)},${y0.toFixed(1)}))/vec2(${(x1-x0).toFixed(1)},${(y1-y0).toFixed(1)});`);
  shader.fragmentShader='uniform sampler2D atlasRegions;\nuniform float atlasRegionStrength;\nvarying vec2 vAtlasRegion;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nvec3 regionColour=texture2D(atlasRegions,vAtlasRegion).rgb;\ndiffuseColor.rgb=mix(diffuseColor.rgb,regionColour,atlasRegionStrength);');
 };material.customProgramCacheKey=()=>'berlin-neighbourhood-tint-v1';},setState(v){state={...v};strength.value=v.regions?v.opacity*.72:0;railGroup.visible=v.transit;host.dataset.regions=String(v.regions);host.dataset.transit=String(v.transit);},setStyle(id){host.dataset.style=id;for(const line of railGroup.children)line.material.opacity=id==='atlas'?.64:.9;}};
}
