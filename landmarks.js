import * as THREE from './vendor/three.module.js';
// Deliberately lightweight, dimensioned interpretations. Original masses remain
// everywhere except the two precisely identified replacement source objects.
export function addLandmarks(scene,refinements){
 const root=new THREE.Group();root.name='Selected landmark refinements';scene.add(root);
 const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.65,side:THREE.DoubleSide});
 const stone=mat('#e4dbc6'),trim=mat('#d5ccb5'),steel=mat('#465356'),glass=new THREE.MeshStandardMaterial({color:'#9ab7bf',transparent:true,opacity:.38,roughness:.2,metalness:.25,depthWrite:false,side:THREE.DoubleSide});
 function mesh(group,g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);group.add(o);return o;}
 function box(g,x,y,z,w,d,h,m){return mesh(g,new THREE.BoxGeometry(w,d,h),m,x,y,z+h/2);}
 function column(g,x,y,z,r,h,m){const geo=new THREE.CylinderGeometry(r*.88,r,h,12);geo.rotateX(Math.PI/2);return mesh(g,geo,m,x,y,z+h/2);}
 function line(g,points,m,r=.12){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return mesh(g,new THREE.TubeGeometry(curve,Math.max(12,points.length*2),r,4,false),m);}
 for(const r of refinements){
  const g=new THREE.Group();g.position.set(...r.center,r.kind==='dome'?r.roof:r.base);g.rotation.z=r.angle;g.userData.stopId=r.id;root.add(g);
  if(r.kind==='dome'){
   const profile=[];for(let i=0;i<=18;i++){const t=i/18*Math.PI/2;profile.push(new THREE.Vector2(20*Math.cos(t),23*Math.sin(t)));}
   const shell=new THREE.LatheGeometry(profile,48);shell.rotateX(Math.PI/2);mesh(g,shell,glass);
   for(let i=0;i<24;i++){const a=i/24*Math.PI*2,p=[];for(let j=0;j<=16;j++){const t=j/16*Math.PI/2;p.push([20*Math.cos(t)*Math.cos(a),20*Math.cos(t)*Math.sin(a),23*Math.sin(t)]);}line(g,p,steel,.1);}
   for(const z of [0,4,8,12,16,20]){const radius=20*Math.sqrt(1-(z/23)**2);mesh(g,new THREE.TorusGeometry(radius,.1,4,48),steel,0,0,z);}
   const cone=new THREE.ConeGeometry(6,18,24);cone.rotateX(-Math.PI/2);mesh(g,cone,steel,0,0,11);
  }else if(r.kind==='gate'){
   const w=r.width,d=11,h=13.7;box(g,0,0,0,w,d,.25,trim);
   const xs=[-14.3,-8.9,-3.5,3.5,8.9,14.3];
   for(const x of xs){box(g,x,0,.25,1.45,7.8,h,stone);for(const y of [-4.8,4.8]){column(g,x,y,.3,.88,h,stone);box(g,x,y,h,2.2,2.2,.7,trim);}}
   box(g,0,0,h+.7,w,11,1.6,stone);box(g,0,0,h+2.3,w+.7,11.7,.55,trim);box(g,0,0,h+2.85,w-1,10.6,2.4,stone);box(g,0,0,h+5.25,w+.8,11.8,.6,trim);
   // A small sculptural silhouette only: no claim of a detailed Quadriga replica.
   box(g,0,0,19.6,6.6,4,1,trim);const bronze=mat('#6e8d82');box(g,0,0,20.6,3.6,2.8,1.2,bronze);
   for(const x of [-2,-.7,.7,2]){const horse=new THREE.SphereGeometry(1,8,6);horse.scale(.42,1.4,.55);mesh(g,horse,bronze,x,-.6,22);column(g,x,-1.5,21.9,.22,1.5,bronze);for(const y of [-1.2,.1])box(g,x,y,20.6,.17,.18,1.1,bronze);}
   column(g,0,1,21.4,.38,2.6,bronze);box(g,0,1,23.9,.2,.2,1.4,bronze);
  }else if(r.kind==='gallery'){
   const top=r.roof-r.base;box(g,0,0,top-1.8,64.8,64.8,1.8,steel);box(g,0,0,.05,50.4,50.4,top-1.85,glass);
   for(const side of [-1,1])for(const at of [-14.4,14.4]){box(g,side*32.1,at,0,.45,.6,top-1.8,steel);box(g,at,side*32.1,0,.6,.45,top-1.8,steel);}
   for(let x=-25.2;x<=25.21;x+=3.6)for(const sign of [-1,1]){box(g,x,sign*25.25,0,.12,.14,top-1.8,steel);box(g,sign*25.25,x,0,.14,.12,top-1.8,steel);}
   for(let x=-28.8;x<=28.81;x+=3.6){box(g,x,0,top-1.95,.12,64.8,.15,steel);box(g,0,x,top-1.95,64.8,.12,.15,steel);}
  }
 }
 return root;
}
