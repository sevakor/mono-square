import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
const root=process.cwd(), types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const port = Number(process.env.PORT || 4173);
createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let path=normalize(url.pathname).replace(/^\.\.(\/|\\|$)/,'');if(path==='/'||!extname(path))path='/index.html';const data=await readFile(join(root,path));res.writeHead(200,{'Content-Type':types[extname(path)]||'application/octet-stream'});res.end(data)}catch{res.writeHead(404);res.end('Not found')}}).listen(port,()=>console.log(`http://localhost:${port}`));
