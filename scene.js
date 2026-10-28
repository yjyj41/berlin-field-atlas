import * as THREE from './vendor/three.module.js';
import {bytes,json} from './io.js';
import {createCityLayers,readLayers} from './city-layers.js';
import {makeGround} from './ground.js';
import {addLandmarks} from './landmarks.js';
import {finishMaterial,applyFinish} from './finishes.js';
import {mapStyles} from './map-styles.js';

export async function createAtlas(meta,onSelect,visits,initialStyle){
 const $=s=>document.querySelector(s),host=$('#canvas-host'),map=$('#map');
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));host.append(renderer.domElement);
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xffffff,0x7f929b,1.6));const sun=new THREE.DirectionalLight(0xffffff,1.5);sun.position.set(-400,-600,1000);scene.add(sun);
 const bounds=meta.boundsLocal,centre=[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2],mapWidth=(bounds[2]-bounds[0]+bounds[3]-bounds[1])/Math.sqrt(2),mapHeight=mapWidth/Math.sqrt(3);
 const camera=new THREE.OrthographicCamera(-1,1,1,-1,1,40000);camera.up.set(0,0,1);const direction=new THREE.Vector3(1,-1,1).normalize(),target=new THREE.Vector3(...centre,30);
 const frustum=new THREE.Frustum(),projection=new THREE.Matrix4(),ray=new THREE.Raycaster(),plane=new THREE.Plane(new THREE.Vector3(0,0,1),0);
 const resident=new Map(),pending=new Set(),failed=new Set(),groups=new Map(),markers=[],animations=new Map(),progress=new Map();
 const contextMaterial=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
 const layerData=await json('city-layers.json.gz'),cityLayers=createCityLayers(scene,layerData);let layerState=readLayers(()=>localStorage),filteredIds=new Set(meta.stops.map(s=>s.id));cityLayers.setState(layerState);cityLayers.tintContext(contextMaterial);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let style=mapStyles[initialStyle]||mapStyles.atlas,span=5400,initialSpan=5400,selected=null,cardOpen=false,drag,last,down,scheduled,active=0,wanted=[],names=true,numbers=true,contextVisible=true,groundVisible=true,frame=0;
 const size=()=>({w:host.clientWidth,h:host.clientHeight});
 const baseColour=()=>style.landmark;
 const custom=addLandmarks(scene,meta.refinements);
 for(const s of meta.stops){const g=new THREE.Group();g.userData.stopId=s.id;scene.add(g);groups.set(s.id,g);progress.set(s.id,visits.has(s.id)?1:0);}
 for(const g of [...custom.children]){const stop=meta.stops.find(s=>s.id===g.userData.stopId);g.traverse(o=>{if(o.isMesh){o.geometry.setAttribute('finishSurface',new THREE.BufferAttribute(new Float32Array(o.geometry.attributes.position.count),1));o.material=finishMaterial(o.material,stop,baseColour(),false);}});groups.get(stop.id).add(g);}
 // The small landmark meshes remain resident, so visits survive context eviction.
 const landmarkQueue=meta.stops.filter(s=>!s.venue);
 async function loadLandmark(s){
  const [raw,kind]=await Promise.all([bytes(s.model.geometry),bytes(s.model.semantics)]);const p=new Float32Array(raw),sem=new Uint8Array(kind);if(p.length!==s.model.triangles*9||sem.length!==s.model.triangles)throw Error('Invalid landmark buffer: '+s.id);
  if(p.length){const colour=new Float32Array(p.length),surface=new Float32Array(p.length/3),wall=new THREE.Color(s.finish.wall),roof=new THREE.Color(s.finish.roof),ground=new THREE.Color(s.finish.wall).multiplyScalar(.9);
   for(let i=0;i<sem.length;i++){const c=sem[i]===2?roof:sem[i]===0?ground:wall;for(let v=0;v<3;v++){const j=i*9+v*3;colour[j]=c.r;colour[j+1]=c.g;colour[j+2]=c.b;surface[i*3+v]=sem[i];}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setAttribute('color',new THREE.BufferAttribute(colour,3));geo.setAttribute('finishSurface',new THREE.BufferAttribute(surface,1));geo.computeVertexNormals();geo.computeBoundingSphere();
   const mesh=new THREE.Mesh(geo,finishMaterial(new THREE.MeshStandardMaterial({vertexColors:true,roughness:.7,side:THREE.DoubleSide}),s,baseColour()));groups.get(s.id).add(mesh);
  }
  applyFinish(groups.get(s.id),progress.get(s.id),baseColour());
 }
 await Promise.all(Array.from({length:4},async()=>{while(landmarkQueue.length)await loadLandmark(landmarkQueue.shift());}));
 for(const [i,s] of meta.stops.entries()){
  const el=document.createElement('button');el.className='marker'+(s.venue?' venue-marker '+s.kind:'');el.dataset.id=s.id;el.setAttribute('aria-label',s.name);el.innerHTML=`<span class="pin">${s.venue?(s.kind==='clubs'?'♫':'A'):String(i+1).padStart(2,'0')}</span><span class="marker-name"></span>`;el.querySelector('.marker-name').textContent=s.name;el.onclick=()=>onSelect(s.id,true);$('#markers').append(el);markers.push({...s,el});
 }
 for(const t of meta.tiles)t.box=new THREE.Box3(new THREE.Vector3(Math.min(t.bounds[0][0],t.center[0]-500),Math.min(t.bounds[0][1],t.center[1]-500),0),new THREE.Vector3(Math.max(t.bounds[1][0],t.center[0]+500),Math.max(t.bounds[1][1],t.center[1]+500),Math.max(t.bounds[1][2],50)));
 function status(){const el=$('#stream-status');el.textContent=failed.size?'Some areas could not load · click to retry':`${span>meta.overviewDetailThresholdM?'Overview massing · zoom for roof detail':'Official 3D detail'}${active?' · loading areas…':''}`;el.dataset.mode=failed.size?'error':'ready';el.dataset.loaded=resident.size;el.dataset.detailTiles=[...resident.values()].filter(t=>t.level==='detail').length;el.dataset.geometries=renderer.info.memory.geometries;el.dataset.textures=renderer.info.memory.textures;el.dataset.renderedTriangles=renderer.info.render.triangles;}
 function update(){
  const {w,h}=size();if(!w||!h)return;const side=cardOpen&&innerWidth>700?Math.min(315,w*.4):0,bottom=cardOpen&&innerWidth<=700?130:0;
  camera.left=-span*w/h/2+side*span/h/2;camera.right=span*w/h/2+side*span/h/2;camera.top=span/2-bottom*span/h/2;camera.bottom=-span/2-bottom*span/h/2;
  camera.position.copy(target).addScaledVector(direction,15000);camera.lookAt(target);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));wanted=meta.tiles.filter(t=>frustum.intersectsBox(t.box)).sort((a,b)=>(a.center[0]-target.x)**2+(a.center[1]-target.y)**2-(b.center[0]-target.x)**2-(b.center[1]-target.y)**2);
  let detailCount=0,detailTriangles=0;
  for(const t of wanted){const detail=span<=meta.overviewDetailThresholdM&&detailCount<meta.maxResidentTiles&&detailTriangles+t.triangleCount<=meta.maxDetailTriangles;t.desiredLevel=detail?'detail':'overview';if(detail){detailCount++;detailTriangles+=t.triangleCount;}}
  clearTimeout(scheduled);scheduled=setTimeout(stream,100);const occupied=[],pins=[];
  // Broad region labels get space; selected architecture always has priority.
  if(selected){const s=meta.stops.find(s=>s.id===selected),p=new THREE.Vector3(...s.local).project(camera),x=(p.x+1)*w/2,y=(1-p.y)*h/2;occupied.push([x-14,y-20,x+200,y+30]);}
  // A short filtered selection should not lose its pins to orientation labels.
  const cityOccupied=[...occupied];
  if(filteredIds.size<25)for(const s of markers)if(filteredIds.has(s.id)){const p=new THREE.Vector3(...s.local).project(camera),x=(p.x+1)*w/2,y=(1-p.y)*h/2;cityOccupied.push([x-18,y-18,x+18,y+18]);}
  const reserved=cityOccupied.length;cityLayers.place(camera,w,h,span,cityOccupied,side,bottom,true);occupied.push(...cityOccupied.slice(reserved));
  for(const s of [...markers].sort((a,b)=>(b.id===selected)-(a.id===selected))){const p=new THREE.Vector3(...s.local).project(camera),x=(p.x+1)*w/2,y=(1-p.y)*h/2;const nameWidth=Math.min(180,s.name.length*6.3+20),left=x+nameWidth+40>w-side-12;
   const box=left?[x-nameWidth-34,y-15,x+12,y+30]:[x-12,y-15,x+nameWidth+34,y+30];const overlap=occupied.some(b=>box[0]<b[2]+6&&box[2]>b[0]-6&&box[1]<b[3]+6&&box[3]>b[1]-6)||pins.some(p=>p[0]>box[0]-12&&p[0]<box[2]+12&&p[1]>box[1]-12&&p[1]<box[3]+12);
   const pinOverlap=pins.some(p=>Math.hypot(p[0]-x,p[1]-y)<27)||occupied.some(b=>x>b[0]-12&&x<b[2]+12&&y>b[1]-12&&y<b[3]+12);const showName=names&&(!overlap||s.id===selected);s.el.hidden=(pinOverlap&&s.id!==selected)||!(showName||numbers)||p.z<-1||p.z>1||x<15||x>w-side-15||y<180||y>h-bottom-55;
   if(!filteredIds.has(s.id))s.el.hidden=true;
   s.el.classList.toggle('number-only',!showName);s.el.classList.toggle('numbers-hidden',!numbers);s.el.classList.toggle('name-left',left);s.el.classList.toggle('active',s.id===selected);s.el.classList.toggle('visited',visits.has(s.id));s.el.style.left=x+'px';s.el.style.top=y+'px';
   if(!s.el.hidden){pins.push([x,y]);if(showName)occupied.push(box);}
  }
  cityLayers.place(camera,w,h,span,occupied.concat(pins.map(([x,y])=>[x-14,y-14,x+14,y+14])),side,bottom);
  const metresPerPixel=span/h;const targetLength=90*metresPerPixel;const scale=[10,20,50,100,200,500,1000,2000,5000].reduce((a,b)=>Math.abs(b-targetLength)<Math.abs(a-targetLength)?b:a,100);$('#scale-line').style.width=(scale/metresPerPixel)+'px';$('#scale-label').textContent=scale>=1000?scale/1000+' km':scale+' m';$('#zoom-value').textContent=Math.round(initialSpan/span*100)+'%';renderer.render(scene,camera);status();
 }
 function dispose(t){scene.remove(t.group);t.group.traverse(o=>{o.geometry?.dispose();if(o.material&&o.material!==contextMaterial){o.material.map?.dispose();o.material.dispose();}});}
 async function load(t,level){
  const overview=level==='overview',source=overview?t.overview:t;
  const [raw,k,ground]=await Promise.all([bytes(source.geometry),bytes(source.semantics),makeGround(t,style,overview,layerData,layerState)]);const p=new Float32Array(raw),sem=new Uint8Array(k);if(p.length!==source.triangleCount*9||sem.length!==source.triangleCount)throw Error('Invalid context buffer');
  const keep=new Uint8Array(sem.length).fill(1);for(const r of (overview?[]:meta.landmarkRanges))if(r.tile===t.id)keep.fill(0,r.start,r.start+r.count);
  const count=keep.reduce((a,b)=>a+b,0),positions=new Float32Array(count*9),colors=new Uint8Array(count*9);let at=0;
  for(let i=0;i<keep.length;i++)if(keep[i]){positions.set(p.subarray(i*9,i*9+9),at*9);colors.fill(sem[i]===2?255:215,at*9,at*9+9);at++;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('color',new THREE.BufferAttribute(colors,3,true));g.computeVertexNormals();g.computeBoundingSphere();const mesh=new THREE.Mesh(g,contextMaterial);mesh.visible=contextVisible;ground.visible=groundVisible;ground.userData.setStyle(style);ground.userData.setLayers(layerState);const group=new THREE.Group();group.add(mesh,ground);return {group,mesh,ground,level};
 }
 function stream(){
  const ids=new Set(wanted.map(t=>t.id));for(const [id,t] of resident)if(!ids.has(id)){dispose(t);resident.delete(id);}
  for(const t of wanted){if(active>=2)break;const level=t.desiredLevel,key=t.id+':'+level;if(resident.get(t.id)?.level===level||pending.has(key)||failed.has(key))continue;
   active++;pending.add(key);load(t,level).then(r=>{if(wanted.some(x=>x.id===t.id&&x.desiredLevel===level)){const previous=resident.get(t.id);if(previous)dispose(previous);resident.set(t.id,r);scene.add(r.group);}else dispose(r);}).catch(e=>{failed.add(key);console.error(e);}).finally(()=>{active--;pending.delete(key);update();stream();});
  }status();
 }

 function worldAt(x,y){const r=host.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2),camera);return ray.ray.intersectPlane(plane,new THREE.Vector3());}
 function zoom(f){span=Math.max(100,Math.min(20000,span/f));update();}
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag=e.pointerId;last=[e.clientX,e.clientY];down=last;canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(drag!==e.pointerId)return;const a=worldAt(...last),b=worldAt(e.clientX,e.clientY);if(a&&b)target.add(a.sub(b));last=[e.clientX,e.clientY];update();});
 canvas.addEventListener('pointerup',e=>{if(drag===e.pointerId&&down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])<5){const r=host.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObjects([...groups.entries()].filter(([id])=>filteredIds.has(id)).map(([,g])=>g),true)[0];if(hit){let o=hit.object;while(o&&!o.userData.stopId)o=o.parent;if(o)onSelect(o.userData.stopId,false);}}drag=null;});
 for(const e of ['pointercancel','lostpointercapture'])canvas.addEventListener(e,()=>drag=null);
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.001));},{passive:false});
 host.addEventListener('keydown',e=>{const moves={ArrowLeft:[-60,0],ArrowRight:[60,0],ArrowUp:[0,-60],ArrowDown:[0,60]};if(moves[e.key]){e.preventDefault();const r=host.getBoundingClientRect(),[dx,dy]=moves[e.key],a=worldAt(r.left+r.width/2,r.top+r.height/2),b=worldAt(r.left+r.width/2+dx,r.top+r.height/2+dy);if(a&&b)target.add(a.sub(b));update();}if(e.key==='+'||e.key==='=')zoom(1.25);if(e.key==='-')zoom(.8);});
 function reset(){selected=null;cardOpen=false;target.set(...centre,30);const {w,h}=size();span=Math.min(20000,Math.max(mapHeight*1.35,mapWidth*1.25*h/Math.max(250,w)));initialSpan=span;update();}
 function resize(){const {w,h}=size();renderer.setSize(w,h);update();}const observer=new ResizeObserver(resize);observer.observe(host);
 function animate(now){let remaining=false;for(const [id,a] of animations){const t=Math.min(1,(now-a.start)/900),v=a.from+(a.to-a.from)*(t*t*(3-2*t));progress.set(id,v);applyFinish(groups.get(id),filteredIds.has(id)?v:0,filteredIds.has(id)?style.landmark:style.height);if(t===1)animations.delete(id);else remaining=true;}update();frame=remaining?requestAnimationFrame(animate):0;}
 function setVisited(id,value,animated=false){const to=value?1:0,from=progress.get(id)||0;if(from===to&&!animations.has(id))return;animations.delete(id);if(animated&&!reduced.matches){animations.set(id,{from,to,start:performance.now()});if(!frame)frame=requestAnimationFrame(animate);}else{progress.set(id,to);applyFinish(groups.get(id),filteredIds.has(id)?to:0,filteredIds.has(id)?style.landmark:style.height);update();}}
 function setStyle(id){style=mapStyles[id]||mapStyles.atlas;map.dataset.style=id;cityLayers.setStyle(id);scene.background=new THREE.Color(style.background);contextMaterial.color.set(style.height);for(const [sid,g]of groups)applyFinish(g,filteredIds.has(sid)?progress.get(sid):0,filteredIds.has(sid)?style.landmark:style.height);for(const t of resident.values())t.ground.userData.setStyle(style);update();}
 $('#stream-status').onclick=()=>{failed.clear();stream();};setStyle(initialStyle);resize();reset();
 return {zoom,reset,setVisited,setStyle,layerData,
 setLayers(v){layerState={...v};cityLayers.setState(v);for(const t of resident.values())t.ground.userData.setLayers(v);update();},
 setFilter(ids){filteredIds=new Set(ids);if(selected&&!filteredIds.has(selected)){selected=null;cardOpen=false;document.body.classList.add('detail-closed');}for(const [id,g] of groups)applyFinish(g,filteredIds.has(id)?progress.get(id):0,filteredIds.has(id)?style.landmark:style.height);update();},
select(id,focus=true){selected=id;cardOpen=true;if(focus){const s=meta.stops.find(s=>s.id===id),[lo,hi]=s.model.bounds;target.set((lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2);span=Math.max(id==='berlin-brandenburg-gate'?150:240,(hi[2]-lo[2])*1.6,(hi[0]-lo[0])*2,(hi[1]-lo[1])*2);}update();},closeCard(){cardOpen=false;update();},setContext(v){contextVisible=v;for(const t of resident.values())t.mesh.visible=v;update();},setGround(v){groundVisible=v;for(const t of resident.values())t.ground.visible=v;update();},setLabels(v){names=v.names;numbers=v.numbers;update();},refresh:update};
}
