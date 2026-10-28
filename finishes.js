import * as THREE from './vendor/three.module.js';
// Photo-informed colour studies with inferred facade patterns, not photogrammetry.
export function finishMaterial(material,stop,baseColour,pattern=true){
 const m=material.clone(),bounds=stop.model.bounds;
 const uniforms={uReveal:{value:0},uUnvisited:{value:new THREE.Color(baseColour)},uBaseZ:{value:bounds[0][2]},uHeight:{value:Math.max(1,bounds[1][2]-bounds[0][2]+(stop.id==='berlin-reichstag'?23:0))},uPattern:{value:pattern?stop.finish.pattern:3},uGlass:{value:new THREE.Color(stop.finish.glass)},uFinishOpacity:{value:material.opacity}};
 m.opacity=1;m.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='attribute float finishSurface; varying vec3 vFinishPosition; varying float vFinishSurface;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFinishPosition=(modelMatrix*vec4(position,1.0)).xyz;vFinishSurface=finishSurface;');
  shader.fragmentShader='uniform float uReveal; uniform vec3 uUnvisited; uniform float uBaseZ; uniform float uHeight; uniform float uPattern; uniform vec3 uGlass; uniform float uFinishOpacity; varying vec3 vFinishPosition; varying float vFinishSurface;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   vec3 finish=diffuseColor.rgb;
   if(vFinishSurface>0.5 && vFinishSurface<1.5 && uPattern<2.5){
    vec3 n=abs(normalize(cross(dFdx(vFinishPosition),dFdy(vFinishPosition))));
    float horizontal=n.x>n.y?vFinishPosition.y:vFinishPosition.x;
    vec2 uv=vec2(horizontal/3.6,(vFinishPosition.z-uBaseZ)/3.6);
    vec2 f=fract(uv);vec2 aa=max(fwidth(uv),vec2(0.015));
    if(uPattern<0.5){
     float opening=smoothstep(.24-aa.x,.24+aa.x,f.x)*(1.0-smoothstep(.76-aa.x,.76+aa.x,f.x))*smoothstep(.18-aa.y,.18+aa.y,f.y)*(1.0-smoothstep(.72-aa.y,.72+aa.y,f.y));
     finish=mix(finish,uGlass,opening*.72);
    }else if(uPattern<1.5){
     float grid=max(1.0-smoothstep(.035,.035+aa.x,min(f.x,1.0-f.x)),1.0-smoothstep(.025,.025+aa.y,min(f.y,1.0-f.y)));
     finish=mix(mix(finish,uGlass,.55),vec3(.16,.20,.22),grid*.65);
    }else{
     float seam=1.0-smoothstep(.025,.025+aa.x,min(fract(horizontal/.8),1.0-fract(horizontal/.8)));
     finish*=1.0-seam*.16;
    }
   }
   float level=clamp((vFinishPosition.z-uBaseZ)/uHeight,0.0,1.0);
   float amount=uReveal<.001?0.0:(uReveal>.999?1.0:1.0-smoothstep(uReveal-.12,uReveal+.12,level));
   diffuseColor.rgb=mix(uUnvisited,finish,amount);diffuseColor.a=mix(1.0,uFinishOpacity,amount);
  `);
 };
 m.customProgramCacheKey=()=> 'berlin-visited-facades-v1';
 m.userData.finishUniforms=uniforms;return m;
}
export function applyFinish(group,value,baseColour){group.traverse(o=>{const u=o.material?.userData?.finishUniforms;if(u){u.uReveal.value=value;if(baseColour)u.uUnvisited.value.set(baseColour);}});}
