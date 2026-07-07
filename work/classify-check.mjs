const pos=[[0,0],[0,1],[1,1],[1,0]];
function matrix(t){const m=Array.from({length:4},()=>Array(4).fill(0));t.forEach((p,i)=>{const [r,c]=pos[p];m[Math.floor(i/2)*2+r+(i<2?0:0)][i%2*2+c]=1});return m}
const transforms=[
 m=>m.map(r=>[...r].reverse()),
 m=>[...m].reverse().map(r=>[...r]),
 m=>m[0].map((_,c)=>m.map(r=>r[c])),
 m=>m[0].map((_,c)=>m.map(r=>r[3-c])).reverse(),
 m=>m[0].map((_,c)=>m.map(r=>r[c]).reverse()),
 m=>[...m].reverse().map(r=>[...r].reverse()),
 m=>m[0].map((_,c)=>m.map(r=>r[c]).reverse()).reverse()
];
function features(t){const m=matrix(t),flat=m.flat().join(''),sym=transforms.filter(f=>f(m).flat().join('')===flat).length;let edges=0;for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(m[r][c]){if(m[r+1]?.[c])edges++;if(m[r][c+1])edges++}const seen=new Set();let components=0;for(let r=0;r<4;r++)for(let c=0;c<4;c++)if(m[r][c]&&!seen.has(`${r},${c}`)){components++;const q=[[r,c]];while(q.length){const [a,b]=q.pop(),k=`${a},${b}`;if(seen.has(k)||!m[a]?.[b])continue;seen.add(k);q.push([a+1,b],[a-1,b],[a,b+1],[a,b-1])}}return{sym,edges,components,unique:new Set(t).size,center:m[1][1]+m[1][2]+m[2][1]+m[2][2]}}
function level(f){if(f.sym>=2||f.unique===1||(f.sym>=1&&f.unique<=2))return 1;if(f.sym>=1||f.unique<=2||f.components<=2||f.edges>=2)return 2;if(f.sym===0&&f.unique>=3&&f.components===4&&f.edges===0)return 4;return 3}
const counts=[0,0,0,0,0], examples={};for(let n=0;n<256;n++){const t=[n>>6&3,n>>4&3,n>>2&3,n&3],f=features(t),l=level(f);counts[l]++;(examples[l]??=[]).push({n:n.toString(16).padStart(2,'0'),t,f})}console.log(counts.slice(1));for(let l=1;l<=4;l++)console.log(l,examples[l].slice(0,8));
