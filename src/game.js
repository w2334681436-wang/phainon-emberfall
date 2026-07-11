window.__PH_GAME_B64='';
async function boot(){
  await import('./runtime-chunk-1.js');
  await import('./runtime-chunk-2.js');
  await import('./runtime-chunk-3.js');
  if(typeof DecompressionStream==='undefined') throw new Error('当前浏览器不支持 DecompressionStream，请使用最新版 Chrome、Edge 或 Safari。');
  const raw=atob(window.__PH_GAME_B64);
  const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  const source=await new Response(stream).text();
  (0,eval)(source+'\n//# sourceURL=phainon-emberfall-runtime.js');
}
boot().catch(error=>{
  console.error(error);
  const menu=document.getElementById('menu');
  if(menu){menu.classList.add('visible');menu.innerHTML='<h2>游戏加载失败</h2><p style="line-height:1.7">'+String(error.message||error)+'</p><button class="primary" onclick="location.reload()">重新加载</button>';}
});
