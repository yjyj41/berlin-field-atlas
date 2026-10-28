import {readLayers,saveLayers} from './city-layers.js';
export function setupLayers(atlas,data){
 const details=document.createElement('details');details.id='layer-controls';details.className='label-controls layer-controls';
 details.innerHTML=`<summary>Layers <span class="layer-count"></span></summary><div class="layer-panel"><div class="layer-panel-heading">READ THE CITY</div><label><input type="checkbox" data-layer="regions"> Neighbourhood colours</label><div class="layer-opacity"><label for="region-opacity">Colour strength</label><input id="region-opacity" type="range" min="15" max="80" step="5"><output for="region-opacity"></output></div><label><input type="checkbox" data-layer="transit"> U-Bahn &amp; S-Bahn</label><div class="transit-key"><span><b class="mode-U">U</b> U-Bahn</span><span><b class="mode-S">S</b> S-Bahn</span></div><label><input type="checkbox" data-layer="streets"> Streets &amp; squares</label><label><input type="checkbox" data-layer="parks"> Parks &amp; gardens</label><label><input type="checkbox" data-layer="water"> Rivers &amp; lakes</label><p class="layer-note">Labels reveal as you zoom. Rail lines show mapped corridors; dashed sections are underground. No live service information.</p><details class="region-key"><summary>Neighbourhood colour key</summary><div class="region-swatches"></div><p>Mapped Ortsteile boundaries, clipped to this map.</p></details><p class="layer-save" role="status"></p><a class="layer-source" href="./data/city-layers.json.gz" download>Layer data · © OpenStreetMap / ODbL ↓</a></div>`;
 document.querySelector('.model-toolbar').append(details);
 let state=readLayers(()=>localStorage);const slider=details.querySelector('input[type=range]');
 function apply(save=false){
  for(const el of details.querySelectorAll('[data-layer]'))el.checked=state[el.dataset.layer];
  slider.value=Math.round(state.opacity*100);slider.disabled=!state.regions;details.querySelector('output').textContent=slider.value+'%';
  details.querySelector('.layer-count').textContent=Object.entries(state).filter(([k,v])=>k!=='opacity'&&v).length;
  atlas.setLayers(state);if(save)details.querySelector('.layer-save').textContent=saveLayers(state,()=>localStorage)?'':'Preferences could not be saved; active for this session.';
 }
 for(const el of details.querySelectorAll('[data-layer]'))el.onchange=()=>{state={...state,[el.dataset.layer]:el.checked};apply(true);};
 slider.oninput=()=>{state={...state,opacity:Number(slider.value)/100};apply(true);};
 for(const r of data.regions){const el=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=r.color;el.append(swatch,document.createTextNode(r.name));details.querySelector('.region-swatches').append(el);}
 details.addEventListener('keydown',e=>{if(e.key==='Escape'){details.open=false;details.querySelector('summary').focus();}});
 document.addEventListener('pointerdown',e=>{if(!details.contains(e.target))details.open=false;});
 details.addEventListener('toggle',()=>{if(details.open)document.querySelector('#label-controls').open=false;});
 document.querySelector('#label-controls').addEventListener('toggle',e=>{if(e.target.open)details.open=false;});apply();
}
