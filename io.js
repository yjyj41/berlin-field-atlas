export async function bytes(path){
 const r=await fetch('./data/'+path);if(!r.ok)throw Error(`Asset unavailable: ${path}`);
 if(path.endsWith('.gz')){if(!('DecompressionStream' in window))throw Error('This browser needs gzip stream support. Please use a current browser.');return new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();}
 return r.arrayBuffer();
}
export async function json(path){return JSON.parse(new TextDecoder().decode(await bytes(path)));}
