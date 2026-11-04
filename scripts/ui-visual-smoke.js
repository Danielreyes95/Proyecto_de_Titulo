"use strict";
// Test de interfaz en Chromium con datos completamente ficticios y servidor aislado.
const http=require("node:http"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {spawnSync,spawn}=require("node:child_process");
const root=path.resolve(__dirname,"..","public"),out=path.resolve(__dirname,"..","visual-smoke-output");
const sid="6ab9d94c7205a988b1853bc4",cid="6ad174cf2e246eb52b17b0f1",pid="6b0000000000000000000001";
const school={_id:sid,id:sid,nombre:"Academia Los Leones Demo",slug:"los-leones-demo",estado:"activa",branding:{
nombrePublico:"Academia Los Leones Demo",colorPrimario:"#683ac6",colorSecundario:"#ffffff",colorAcento:"#f27686",colorTexto:"#24243d"}};
const categories=[{_id:cid,nombre:"Sub 8",modalidad:"formativo",edadMin:6,edadMax:8,cupos:20,estado:"activa"},
{_id:"6ad174cf2e246eb52b17b0f2",nombre:"Sub 10",modalidad:"competitivo",edadMin:9,edadMax:10,cupos:20,estado:"activa"}];
const players=[{_id:pid,nombre:"Jugador Demo",rut:"11.111.111-1",fechaNacimiento:"2018-01-01T00:00:00.000Z",categoria:categories[0],apoderados:[],estado:"activo"}];
const trainers=[{_id:"6b0000000000000000000002",nombre:"Entrenador Demo",email:"entrenador@ejemplo.invalid",estado:"activo",categorias:[categories[0]]}];
const guardians=[{_id:"6b0000000000000000000004",nombre:"Contacto Demo",email:"familia@ejemplo.invalid",rut:"11.111.111-1",estado:"activo"}];
const date=new Date(Date.now()+7*86400000).toISOString().slice(0,10)+"T00:00:00.000Z";
const events=[{_id:"6b0000000000000000000003",categoria:cid,fechaEvento:date,horaInicio:"10:00",tipoEvento:"Entrenamiento",cerrado:false,revision:0,cantidadJugadores:1,pendientes:1,confirmaciones:{asistiran:0,noAsistiran:0,sinResponder:1}}];
const notices=[{_id:"6b0000000000000000000005",titulo:"Entrenamiento de prueba",mensaje:"Información ficticia para la demostración.",estado:"publicado",categoria:null,publicadoEn:new Date().toISOString(),alcance:"escuela"}];
const totals={actividades:4,porcentajeAsistencia:80,goles:5,asistenciasGol:4};
function respond(res,obj){res.writeHead(200,{"Content-Type":"application/json","Cache-Control":"no-store"});res.end(JSON.stringify(obj));}
function fixture(p,req){
const family=(req.headers.cookie||"").includes("visualRole=family");
if(p.startsWith("/api/platform/")){
if(p.endsWith("/escuelas"))return {escuelas:[school]};
return {usuario:{email:"admin@ejemplo.invalid"}};
}
if(p==="/api/escuela-sesion/mis-escuelas")return {escuelas:[{...school,roles:family?["apoderado"]:["director"]}]};
if(p.endsWith("/personal"))return {escuela:school,rol:"director"};
if(p.endsWith("/director"))return {escuela:school};
if(p.endsWith("/mis-categorias")||p.endsWith("/categorias"))return {categorias:categories};
if(p.endsWith("/entrenadores"))return {entrenadores:trainers};
if(p.endsWith("/jugadores"))return {jugadores:players};
if(p.endsWith("/apoderados"))return {apoderados:guardians};
if(p.endsWith("/eventos"))return {eventos:events};
if(p.endsWith("/estadisticas/resumen"))return {totales:totals,categorias:categories.map(c=>({
categoriaId:c._id,nombre:c.nombre,modalidad:c.modalidad,estado:c.estado,actividades:2,porcentajeAsistencia:80,goles:3}))};
if(p.includes("/estadisticas/categorias/")&&p.includes("/jugadores/"))return {jugador:{nombre:"Jugador Demo"},ultimasActividades:[],hayMas:false};
if(p.includes("/estadisticas/categorias/"))return {categoria:categories[0],anio:new Date().getUTCFullYear(),
resumen:{...totals,presentes:32,ausentes:8},
porTipo:[{tipo:"Entrenamiento",actividades:2},{tipo:"Partido",actividades:1},{tipo:"Torneo",actividades:1}],
porMes:Array.from({length:12},(_,i)=>({mes:i+1,actividades:i>=3&&i<=6?1:0})),
jugadores:[{jugadorId:pid,nombre:"Jugador Demo",porcentajeAsistencia:80,presentes:4,ausentes:1,goles:2,asistenciasGol:1,recuperaciones:5,promedioRendimiento:8}]};
if(p.includes("/familia/mis-jugadores"))return {escuela:school,jugadores:[{nombre:"Jugador Demo",categoria:categories[0],asistenciaReciente:{porcentaje:80},ultimasActividades:[]}]};
if(p.includes("/familia/agenda"))return {proximasActividades:[],avisos:notices};
if(p.endsWith("/avisos"))return {avisos:notices};
if(p.includes("/eventos/"))return {evento:{...events[0],categoriaNombre:"Sub 8 · Formativo"},jugadores:[{jugadorId:pid,nombre:"Jugador Demo",asistencia:"pendiente",confirmacion:"pendiente",estadisticas:{},observacion:""}]};
return {};
}
function probe(){
return '<script>if(new URLSearchParams(location.search).get("menuTest")==="1"){setTimeout(function(){var b=document.querySelector(".app-menu-toggle");if(b)b.click()},900)}setTimeout(function(){'+
'function shown(q){var el=document.querySelector(q);if(!el||el.hidden)return false;var s=getComputedStyle(el);return s.display!=="none"&&s.visibility!=="hidden"}'+
'var d={width:innerWidth,scrollWidth:document.documentElement.scrollWidth,sidebar:shown(".app-sidenav"),topbar:shown(".app-topbar"),director:shown("#seleccion"),categories:document.querySelectorAll(".category-card").length,coaches:document.querySelectorAll(".coach-card").length,players:document.querySelectorAll("#tabla tr").length,bars:document.querySelectorAll(".month-column").length,family:shown(".family-dashboard"),menuOpen:document.body.classList.contains("app-menu-open"),css:[].some.call(document.styleSheets,function(x){return String(x.href).includes("app-v2.css")}),old:[].some.call(document.styleSheets,function(x){return String(x.href).includes("plataforma.css")})};'+
'var e=document.createElement("output");e.id="__visual_probe";e.textContent=JSON.stringify(d);document.body.appendChild(e);'+
'},1800)</script>';
}
function serve(req,res){
const u=new URL(req.url,"http://localhost"),p=u.pathname;
if(p==="/__session"){
const kind=u.searchParams.get("kind")||"school",next=u.searchParams.get("next")||"/plataforma.html";
const k=kind==="platform"?"platformToken":"schoolToken";
const js="sessionStorage.setItem("+JSON.stringify(k)+",'visual-smoke');"+
"document.cookie='visualRole="+(kind==="family"?"family":"school")+";SameSite=Lax';"+
"location.replace("+JSON.stringify(next)+");";
res.writeHead(200,{"Content-Type":"text/html"});res.end("<html><body><script>"+js+"</script></body></html>");return;
}
if(p.startsWith("/api/")){respond(res,fixture(p,req));return;}
const filename=path.resolve(root,"."+decodeURIComponent(p==="/"?"/plataforma.html":p));
if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
fs.readFile(filename,(error,buffer)=>{
if(error){res.writeHead(404);res.end("No encontrado");return;}
const ext=path.extname(filename);
const mime={".html":"text/html; charset=utf-8",".js":"application/javascript",".css":"text/css",".png":"image/png",".svg":"image/svg+xml"};
res.writeHead(200,{"Content-Type":mime[ext]||"application/octet-stream","Cache-Control":"no-store"});
res.end(ext===".html"?buffer.toString("utf8").replace("</body>",probe()+"</body>"):buffer);
});
}
function browser(){
for(const x of [process.env.CHROME_BIN,"google-chrome","google-chrome-stable","chromium","chromium-browser"].filter(Boolean)){
const r=spawnSync("which",[x],{encoding:"utf8"});
if(r.status===0)return r.stdout.trim();
if(fs.existsSync(x))return x;
}
throw new Error("Chromium/Chrome no encontrado");
}
function run(bin,args,url){
return new Promise((resolve,reject)=>{
const userDir=fs.mkdtempSync(path.join(os.tmpdir(),"football-visual-"));
const p=spawn(bin,["--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage","--hide-scrollbars",
"--no-first-run","--virtual-time-budget=5000","--user-data-dir="+userDir,...args,url]);
let stdout="",stderr="",timedOut=false;
const timer=setTimeout(()=>{timedOut=true;p.kill("SIGKILL");},35000);
p.stdout.on("data",data=>{stdout+=data.toString();if(stdout.length>12000000)p.kill("SIGKILL");});
p.stderr.on("data",data=>{stderr+=data.toString().slice(-50000);});
p.on("error",err=>{clearTimeout(timer);reject(err);});
p.on("close",code=>{
  clearTimeout(timer);
  try{fs.rmSync(userDir,{recursive:true,force:true,maxRetries:6,retryDelay:150});}catch{}
  if(timedOut)return reject(new Error("Chromium excedió el tiempo de carga: "+url));
  if(code!==0)return reject(new Error("Chromium: "+stderr.slice(-850)));
  resolve(stdout);
});
});
}
const tests=[
["superadmin","plataforma.html","platform","sidebar"],
["director","director-acceso.html?escuela="+sid,"school","director"],
["categorias","categorias-escuela.html?escuela="+sid,"school","categories"],
["entrenadores","entrenadores-escuela.html?escuela="+sid,"school","coaches"],
["jugadores","jugadores-escuela.html?escuela="+sid,"school","players"],
["cancha","registro-rapido.html?escuela="+sid,"school","sidebar"],
["estadisticas","estadisticas-escuela.html?escuela="+sid,"school","bars"],
["comunicados","avisos-escuela.html?escuela="+sid,"school","sidebar"],
["familia","familia-acceso.html","family","family"],
["activar-director","activar-director.html","none","css"],
["activar-entrenador","activar-entrenador.html","none","css"],
["activar-apoderado","activar-apoderado.html","none","css"]
];
async function main(){
fs.mkdirSync(out,{recursive:true});
const bin=browser(),server=http.createServer(serve);
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const urlBase="http://127.0.0.1:"+server.address().port;
let failures=0;
try{
for(const [name,page,kind,expected] of tests){
const url=kind==="none"?urlBase+"/"+page:urlBase+"/__session?kind="+kind+"&next="+encodeURIComponent("/"+page);
const html=await run(bin,["--window-size=1440,960","--dump-dom"],url);
const match=html.match(/<output id="__visual_probe">([^<]+)<\/output>/);
if(!match){console.error("FAIL "+name+" sin prueba de DOM");failures++;continue;}
const d=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
const okay=d.css&&!d.old&&(kind==="none"||(d.sidebar&&d.topbar))&&
(expected==="sidebar"||expected==="css"||Boolean(d[expected]));
console.log((okay?"PASS ":"FAIL ")+name+" "+JSON.stringify(d));
if(!okay)failures++;
if(["superadmin","director","categorias","entrenadores","jugadores","cancha","estadisticas","familia"].includes(name)){
await run(bin,["--window-size=1440,960","--screenshot="+path.join(out,name+"-desktop.png")],url);
await run(bin,["--window-size=390,844","--screenshot="+path.join(out,name+"-mobile.png")],url);
const mobileDom=await run(bin,["--window-size=390,844","--dump-dom"],url);
const mobileResult=mobileDom.match(/<output id="__visual_probe">([^<]+)<\/output>/);
if(!mobileResult){console.error("FAIL móvil "+name+" sin DOM");failures++;}
else{
  const m=JSON.parse(mobileResult[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
  const fits=m.scrollWidth<=m.width+6&&m.css&&!m.old;
  console.log((fits?"PASS ":"FAIL ")+"móvil "+name+" viewport="+m.width+" contenido="+m.scrollWidth);
  if(!fits)failures++;
}
}
}
const navUrl=urlBase+"/__session?kind=school&next="+encodeURIComponent("/director-acceso.html?escuela="+sid+"&menuTest=1");
const navDom=await run(bin,["--window-size=390,844","--dump-dom"],navUrl);
const navMatch=navDom.match(/<output id="__visual_probe">([^<]+)<\/output>/);
const navDiag=navMatch?JSON.parse(navMatch[1].replaceAll("&quot;",'"').replaceAll("&amp;","&")):{};
if(!navDiag.menuOpen){console.error("FAIL menú móvil no se abre");failures++;}
else console.log("PASS menú móvil desplegable");
}finally{await new Promise(resolve=>server.close(resolve));}
if(failures)throw new Error(failures+" vistas no superaron la prueba");
console.log("Capturas verificables en "+out);
}
main().catch(error=>{console.error(error.stack||error.message);process.exitCode=1;});
