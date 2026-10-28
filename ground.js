import * as THREE from './vendor/three.module.js';
import {bytes,json} from './io.js';
export async function makeGround(tile,style,overview=false,cityLayers=null,layerState=null){
 const [data,buffer]=await Promise.all([json(tile.ground+'.json.gz'),bytes(overview?tile.overview.groundGeometry:tile.ground+'.f32.gz')]);
 const positions=new Float32Array(buffer);if(positions.length!==(overview?tile.overview.groundTriangles:data.triangles)*9)throw Error('Ground length mismatch');
 const [x0,y0,x1,y1]=data.bounds,w=x1-x0,h=y1-y0,size=overview?256:1024;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');ctx.fillStyle='#d6d5cb';ctx.fillRect(0,0,size,size);
 function paint(f,color){ctx.beginPath();for(const ring of f.rings){ring.forEach(([x,y],i)=>{const u=(x-x0)/w*size,v=(y1-y)/h*size;i?ctx.lineTo(u,v):ctx.moveTo(u,v)});ctx.closePath();}ctx.fillStyle=color;ctx.fill('evenodd');}
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 let palette=style,settings=layerState||{regions:false,streets:true,parks:true,water:true,opacity:.48};
 function setStyle(p){palette=p;ctx.globalAlpha=1;ctx.fillStyle=p.ground;ctx.fillRect(0,0,size,size);
  if(settings.regions&&cityLayers){ctx.globalAlpha=settings.opacity;for(const region of cityLayers.regions)for(const rings of region.polygons)paint({rings},region.color);ctx.globalAlpha=1;}
  for(const a of data.areas)if(a.kind==='park'&&settings.parks)paint(a,p.parks);
  for(const r of data.roads)if(!r.bridge)paint(r,p.roads);
  for(const a of data.areas)if(a.kind==='water'&&settings.water)paint(a,p.water);
  for(const r of data.roads)if(r.bridge)paint(r,p.roads);
  if(settings.streets&&cityLayers){ctx.strokeStyle=p.background==='#e9edf0'?'#b9a994':'#a0a9b0';ctx.globalAlpha=.55;ctx.lineWidth=overview?.7:1.6;
   ctx.beginPath();for(const road of cityLayers.streets)if(road.rank<4)for(const line of road.lines)line.forEach(([x,y],i)=>{const u=(x-x0)/w*size,v=(y1-y)/h*size;i?ctx.lineTo(u,v):ctx.moveTo(u,v);});ctx.stroke();ctx.globalAlpha=1;
  }
  if(settings.regions&&cityLayers){ctx.lineWidth=overview?.65:1.1;ctx.strokeStyle=p.background==='#e9edf0'?'#6e7184':'#c2cad9';ctx.globalAlpha=.5;ctx.beginPath();for(const region of cityLayers.regions)for(const rings of region.polygons)for(const ring of rings){ring.forEach(([x,y],i)=>{const u=(x-x0)/w*size,v=(y1-y)/h*size;i?ctx.lineTo(u,v):ctx.moveTo(u,v);});ctx.closePath();}ctx.stroke();ctx.globalAlpha=1;}
  texture.needsUpdate=true;
 }
 setStyle(style);
 const uv=new Float32Array(positions.length/3*2);for(let i=0;i<positions.length/3;i++){uv[i*2]=(positions[i*3]-x0)/w;uv[i*2+1]=(positions[i*3+1]-y0)/h;}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setAttribute('uv',new THREE.BufferAttribute(uv,2));g.computeVertexNormals();
 const mesh=new THREE.Mesh(g,new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide}));mesh.name='ground';mesh.userData.setStyle=setStyle;mesh.userData.setLayers=v=>{settings={...v};setStyle(palette);};return mesh;
}
