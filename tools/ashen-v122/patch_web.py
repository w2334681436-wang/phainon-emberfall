from pathlib import Path
import sys

if len(sys.argv) != 2:
    raise SystemExit("Usage: patch_web.py <compiled-index-js>")

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

replacements = {
    'Rt=new m0({antialias:!yt,powerPreference:"high-performance",preserveDrawingBuffer:!1}),Rt.setPixelRatio(Math.min(devicePixelRatio,yt?1:1.55)),Rt.setSize(innerWidth,innerHeight),Rt.shadowMap.enabled=!yt,':
    'Rt=new m0({antialias:!1,powerPreference:"default",preserveDrawingBuffer:!1,alpha:!1,stencil:!1,failIfMajorPerformanceCaveat:!1}),Rt.setPixelRatio(Math.min(devicePixelRatio,.72)),Rt.setSize(innerWidth,innerHeight),Rt.shadowMap.enabled=!1,',
    'Cc=new L0(mt,ve,We,{mobile:yt})': 'Cc=null',
    'const i=yt?500:1100,e=new Float32Array(i*3)': 'const i=140,e=new Float32Array(i*3)',
    'const e=this.mobile?96:150,t=new xi': 'const e=56,t=new xi',
    'for(let n=0;n<(this.mobile?10:18);n++)': 'for(let n=0;n<5;n++)',
    'const e=this.mobile?210:360;': 'const e=90;',
    'const t=this.mobile?85:150;': 'const t=36;',
    'for(let n=0;n<(this.mobile?45:80);n++)': 'for(let n=0;n<20;n++)',
    'const t=this.mobile?230:430,n=this.mobile?190:360': 'const t=160,n=135',
    'e(-260,150,this.mobile?12:20,"civilian"),e(220,-250,this.mobile?7:12,"police"),e(440,360,this.mobile?12:20,"military"),e(-440,-360,this.mobile?6:10,"civilian");for(let t=0;t<(this.mobile?6:14);t++)':
    'e(-260,150,5,"civilian"),e(220,-250,3,"police"),e(440,360,5,"military"),e(-440,-360,3,"civilian");for(let t=0;t<2;t++)',
    'ae.showStart(i),ae.updateInventory(be,Rn)':
    'ae.showStart(i),window.__ASHEN_READY__=!0,window.AndroidBridge&&window.AndroidBridge.ready(),console.log("ASHEN_READY"),ae.updateInventory(be,Rn)',
}

for old, new in replacements.items():
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match, found {count}: {old[:100]}")
    text = text.replace(old, new, 1)

path.write_text(text, encoding="utf-8")
print(f"Patched {path} ({path.stat().st_size} bytes)")
