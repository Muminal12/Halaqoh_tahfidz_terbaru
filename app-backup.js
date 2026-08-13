(() => {
"use strict";

const $ = (s,r=document)=>r.querySelector(s);
const $$ = (s,r=document)=>[...r.querySelectorAll(s)];
const KEY="halaqoh_tahfidz_v1";
let meUser=null;

const defaultDB={
  users:[{id:"u_admin",name:"Administrator",username:"admin",password:"admin123",role:"admin"}],
  students:[], groups:[], records:[]
};

function load(){
  try{
    const x=JSON.parse(localStorage.getItem(KEY));
    return x && x.users && x.students && x.groups && x.records ? x : structuredClone(defaultDB);
  }catch{return structuredClone(defaultDB)}
}
let db=load();
function save(){localStorage.setItem(KEY,JSON.stringify(db))}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function uid(p){return p+Date.now()+Math.random().toString(36).slice(2,6)}
function me(){return db.users.find(u=>u.id===meUser)}
function toast(msg,type="ok"){const t=$("#toast");t.textContent=msg;t.className="show "+type;clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.className="",2800)}

function closeModal(){$("#modal").innerHTML=""}
function modal(title,body,submit){
  $("#modal").innerHTML=`<div class="modalbg" id="modalbg"><div class="modalcard"><div class="modalhead"><h2>${title}</h2><button type="button" class="icon-btn" data-close aria-label="Tutup">×</button></div><form id="modalForm">${body}<div class="actions"><button type="button" class="btn ghost" data-close>Batal</button><button class="btn primary">Simpan</button></div></form></div></div>`;
  const bg=$("#modalbg"), f=$("#modalForm");
  $$("[data-close]",bg).forEach(b=>b.onclick=closeModal);
  bg.onclick=e=>{if(e.target===bg)closeModal()};
  f.onsubmit=e=>{e.preventDefault();submit(f)};
  setTimeout(()=>$("input,select,textarea",f)?.focus(),30);
}
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});

function visibleStudents(){
  const u=me();
  return u.role==="admin"?db.students:db.students.filter(s=>s.ustadzId===u.id);
}
function groupName(id){return db.groups.find(g=>g.id===id)?.name||"Belum dikelompokkan"}
function ustadzName(id){return db.users.find(u=>u.id===id)?.name||"Belum ditentukan"}

function login(){
  const u=$("#username").value.trim(), p=$("#password").value;
  const found=db.users.find(x=>x.username===u && x.password===p);
  if(!found){$("#loginError").textContent="Username atau password salah.";$("#loginError").classList.remove("hidden");return}
  meUser=found.id;sessionStorage.setItem("halaqoh_user",found.id);
  $("#loginError").classList.add("hidden");start();
}
function start(){
  if(!meUser)return;
  $("#login").classList.add("hidden");$("#app").classList.remove("hidden");
  render();
}
function logout(){
  meUser=null;sessionStorage.removeItem("halaqoh_user");location.hash="";$("#app").classList.add("hidden");$("#login").classList.remove("hidden");$("#password").value="";
}

$("#loginForm").onsubmit=e=>{e.preventDefault();login()};
$("#togglePassword").onclick=()=>{$("#password").type=$("#password").type==="password"?"text":"password"};
$("#logout").onclick=logout;$("#mlogout").onclick=logout;
$("#menu").onclick=()=>$("#sidebar").classList.toggle("open");
window.addEventListener("hashchange",render);
const saved=sessionStorage.getItem("halaqoh_user");if(saved && db.users.some(u=>u.id===saved)){meUser=saved;start()}

function nav(){
  const admin=me().role==="admin";
  const items=admin?[
    ["dashboard","⌂","Dashboard"],["students","♙","Santri"],["groups","◈","Kelompok"],["users","♟","Akun Ustadz"],["records","✎","Setoran"],["reports","▣","Rekap"]
  ]:[
    ["dashboard","⌂","Dashboard"],["students","♙","Santri Binaan"],["records","✎","Setoran"],["reports","▣","Rekap"]
  ];
  const p=location.hash.slice(1)||"dashboard";
  $("#nav").innerHTML=items.map(i=>`<button class="nav-item ${p===i[0]?"active":""}" data-page="${i[0]}"><span>${i[1]}</span>${i[2]}</button>`).join("");
  $$(".nav-item").forEach(b=>b.onclick=()=>{location.hash=b.dataset.page;$("#sidebar").classList.remove("open")});
  $("#who").textContent=`${me().name} · ${me().role==="admin"?"Admin":"Ustadz"}`;
}

function shell(title,sub,actions=""){return `<div class="page-head"><div><span class="eyebrow">HALAQOH TAHFIDZ</span><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${actions}</div></div>`}
function empty(title,text){return `<div class="empty"><div>◌</div><h3>${title}</h3><p>${text}</p></div>`}

function dashboard(){
  const ss=visibleStudents(), rs=db.records.filter(r=>ss.some(s=>s.id===r.studentId));
  const avg=rs.length?(rs.reduce((a,r)=>a+r.score,0)/rs.length).toFixed(1):"—";
  const recent=[...rs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  return shell("Dashboard","Ringkasan perkembangan halaqoh Anda.")+
  `<div class="stats"><div class="stat"><span>Santri</span><b>${ss.length}</b><small>santri terdaftar</small></div><div class="stat"><span>Kelompok</span><b>${me().role==="admin"?db.groups.length:db.groups.filter(g=>g.ustadzId===me().id).length}</b><small>halaqoh aktif</small></div><div class="stat"><span>Setoran</span><b>${rs.length}</b><small>total catatan</small></div><div class="stat"><span>Rata-rata</span><b>${avg}</b><small>nilai hafalan</small></div></div>
  <div class="grid2"><section class="panel"><div class="panel-title"><h2>Setoran terbaru</h2><button class="text-btn" onclick="location.hash='records'">Lihat semua →</button></div>${recent.length?`<div class="list">${recent.map(r=>{const s=db.students.find(x=>x.id===r.studentId);return `<div class="list-row"><div class="avatar">${esc(s?.name?.[0]||"?")}</div><div><b>${esc(s?.name||"-")}</b><small>${esc(r.surah)} · Ayat ${esc(r.ayat)} · ${r.date}</small></div><strong>${r.score}</strong></div>`}).join("")}</div>`:empty("Belum ada setoran","Catatan setoran akan muncul di sini.")}</section>
  <section class="panel"><div class="panel-title"><h2>Akses cepat</h2></div><div class="quick">${me().role==="admin"?`<button onclick="studentModal()">＋ Tambah Santri</button><button onclick="groupModal()">＋ Buat Kelompok</button><button onclick="userModal()">＋ Akun Ustadz</button>`:""}<button onclick="recordModal()">＋ Catat Setoran</button><button onclick="location.hash='reports'">▣ Lihat Rekap</button></div></section></div>`;
}

function students(){
  const admin=me().role==="admin", ss=visibleStudents();
  return shell(admin?"Data Santri":"Santri Binaan",admin?"Kelola data santri dan pengelompokan.":"Daftar santri yang dibina oleh Anda.",admin?`<button class="btn primary" onclick="studentModal()">＋ Tambah Santri</button>`:"")+
  `<section class="panel"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kelas</th><th>Kelompok</th><th>Ustadz</th><th>Setoran</th>${admin?"<th>Aksi</th>":""}</tr></thead><tbody>${ss.length?ss.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.className||"-")}</td><td>${esc(groupName(s.groupId))}</td><td>${esc(ustadzName(s.ustadzId))}</td><td>${db.records.filter(r=>r.studentId===s.id).length}</td>${admin?`<td><button class="mini danger" onclick="delStudent('${s.id}')">Hapus</button></td>`:""}</tr>`).join(""):`<tr><td colspan="${admin?6:5}">${empty("Belum ada santri","Admin dapat menambahkan santri dari tombol di atas.")}</td></tr>`}</tbody></table></div></section>`;
}

function groups(){
  return shell("Kelompok Halaqoh","Atur kelompok dan ustadz pembina.",`<button class="btn primary" onclick="groupModal()">＋ Buat Kelompok</button>`) +
  `<section class="cards">${db.groups.length?db.groups.map(g=>`<div class="group-card"><div class="group-icon">◈</div><h3>${esc(g.name)}</h3><p>Ustadz: <b>${esc(ustadzName(g.ustadzId))}</b></p><span>${db.students.filter(s=>s.groupId===g.id).length} santri</span></div>`).join(""):empty("Belum ada kelompok","Buat kelompok setelah akun ustadz tersedia.")}</section>`;
}

function users(){
  const us=db.users.filter(u=>u.role==="ustadz");
  return shell("Akun Ustadz","Admin membuat dan mengelola akun ustadz.",`<button class="btn primary" onclick="userModal()">＋ Buat Akun</button>`) +
  `<section class="cards">${us.length?us.map(u=>`<div class="user-card"><div class="avatar big">${esc(u.name[0]||"U")}</div><div><h3>${esc(u.name)}</h3><p>@${esc(u.username)}</p><small>${db.groups.filter(g=>g.ustadzId===u.id).map(g=>esc(g.name)).join(", ")||"Belum memiliki kelompok"}</small></div><button class="mini danger" onclick="delUser('${u.id}')">Hapus</button></div>`).join(""):empty("Belum ada akun ustadz","Buat akun ustadz dari tombol di atas.")}</section>`;
}

function records(){
  const ss=visibleStudents(), rs=db.records.filter(r=>ss.some(s=>s.id===r.studentId)).sort((a,b)=>b.date.localeCompare(a.date));
  return shell("Setoran Hafalan","Catat dan pantau setoran santri.",`<button class="btn primary" onclick="recordModal()">＋ Catat Setoran</button>`) +
  `<section class="panel"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Santri</th><th>Hafalan</th><th>Nilai</th><th>Catatan</th></tr></thead><tbody>${rs.length?rs.map(r=>{const s=db.students.find(x=>x.id===r.studentId);return `<tr><td>${r.date}</td><td><b>${esc(s?.name||"-")}</b></td><td>${esc(r.surah)} · ${esc(r.ayat)}</td><td><span class="score">${r.score}</span></td><td>${esc(r.note||"-")}</td></tr>`}).join(""):`<tr><td colspan="5">${empty("Belum ada setoran","Mulai catat setoran untuk melihat perkembangan.")}</td></tr>`}</tbody></table></div></section>`;
}

function period(type){
  const now=new Date(), y=now.getFullYear(), m=now.getMonth(), q=Math.floor(m/3);
  if(type==="pekanan"){const d=new Date(now);d.setDate(d.getDate()-6);return r=>new Date(r.date)>=d}
  if(type==="bulanan")return r=>{const d=new Date(r.date);return d.getFullYear()===y&&d.getMonth()===m}
  return r=>{const d=new Date(r.date);return d.getFullYear()===y&&Math.floor(d.getMonth()/3)===q}
}
function reportData(type){
  const ss=visibleStudents(), rs=db.records.filter(r=>ss.some(s=>s.id===r.studentId)&&period(type)(r));
  return {ss,rs};
}
function reportHTML(type){
  const {ss,rs}=reportData(type);
  const avg=rs.length?(rs.reduce((a,r)=>a+r.score,0)/rs.length).toFixed(1):"—";
  return `<div class="report-summary"><div><span>Santri</span><b>${ss.length}</b></div><div><span>Setoran</span><b>${rs.length}</b></div><div><span>Rata-rata</span><b>${avg}</b></div></div>
  <div class="table-wrap"><table><thead><tr><th>Santri</th><th>Setoran</th><th>Rata-rata</th><th>Hafalan terakhir</th></tr></thead><tbody>${ss.length?ss.map(s=>{const a=rs.filter(r=>r.studentId===s.id),last=a[a.length-1],av=a.length?(a.reduce((x,r)=>x+r.score,0)/a.length).toFixed(1):"—";return `<tr><td><b>${esc(s.name)}</b></td><td>${a.length}</td><td>${av}</td><td>${last?esc(last.surah)+" · "+esc(last.ayat):"—"}</td></tr>`}).join(""):`<tr><td colspan="4">${empty("Belum ada data","Belum ada setoran pada periode ini.")}</td></tr>`}</tbody></table></div>`;
}
function reports(){
  return shell("Rekap Perkembangan","Unduh rekap sesuai periode. Ustadz hanya mendapat data santri binaannya.",`<button class="btn primary" onclick="downloadPDF()">↓ Unduh PDF</button>`) +
  `<section class="panel"><div class="tabs"><button class="tab active" data-type="pekanan">Pekanan</button><button class="tab" data-type="bulanan">Bulanan</button><button class="tab" data-type="semester">Semester</button></div><div id="report">${reportHTML("pekanan")}</div></section>`;
}

function studentModal(){
  const opts=db.groups.map(g=>`<option value="${g.id}">${esc(g.name)} — ${esc(ustadzName(g.ustadzId))}</option>`).join("");
  modal("Tambah Santri",`<div class="formgrid"><label>Nama<input name="name" required></label><label>Kelas<input name="className" placeholder="Contoh: 8A"></label><label>Kelompok<select name="groupId"><option value="">Belum dikelompokkan</option>${opts}</select></label></div>`,f=>{
    const g=db.groups.find(x=>x.id===f.groupId.value);
    db.students.push({id:uid("s"),name:f.name.value.trim(),className:f.className.value.trim(),groupId:g?.id||"",ustadzId:g?.ustadzId||""});save();closeModal();toast("Santri ditambahkan");render()
  })
}
function userModal(){
  modal("Buat Akun Ustadz",`<div class="formgrid"><label>Nama<input name="name" required></label><label>Username<input name="username" required></label><label>Password<input name="password" type="password" required></label></div>`,f=>{
    const username=f.username.value.trim();
    if(db.users.some(u=>u.username===username))return toast("Username sudah digunakan","error");
    db.users.push({id:uid("u"),name:f.name.value.trim(),username,password:f.password.value,role:"ustadz"});save();closeModal();toast("Akun ustadz dibuat");render()
  })
}
function groupModal(){
  const us=db.users.filter(u=>u.role==="ustadz");
  modal("Buat Kelompok Halaqoh",`<div class="formgrid"><label>Nama kelompok<input name="name" required placeholder="Halaqoh A"></label><label>Ustadz<select name="ustadzId" required><option value="">Pilih ustadz</option>${us.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select></label></div>`,f=>{
    db.groups.push({id:uid("g"),name:f.name.value.trim(),ustadzId:f.ustadzId.value});save();closeModal();toast("Kelompok dibuat");render()
  })
}
function recordModal(){
  const ss=visibleStudents();
  if(!ss.length)return toast("Belum ada santri yang bisa diberi setoran","error");
  modal("Catat Setoran",`<div class="formgrid"><label>Santri<select name="studentId" required>${ss.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label><label>Tanggal<input name="date" type="date" value="${new Date().toISOString().slice(0,10)}" required></label><label>Surat<input name="surah" required placeholder="Al-Mulk"></label><label>Ayat<input name="ayat" required placeholder="1-10"></label><label>Nilai<select name="score"><option value="90">90 — Sangat Baik</option><option value="80">80 — Baik</option><option value="70">70 — Cukup</option><option value="60">60 — Perlu Murajaah</option></select></label><label>Catatan<input name="note" placeholder="Catatan ustadz"></label></div>`,f=>{
    db.records.push({id:uid("r"),studentId:f.studentId.value,date:f.date.value,surah:f.surah.value.trim(),ayat:f.ayat.value.trim(),score:+f.score.value,note:f.note.value.trim()});save();closeModal();toast("Setoran tersimpan");render()
  })
}
function delStudent(id){if(!confirm("Hapus santri dan seluruh setoran santri ini?"))return;db.students=db.students.filter(s=>s.id!==id);db.records=db.records.filter(r=>r.studentId!==id);save();render()}
function delUser(id){if(!confirm("Hapus akun ustadz ini?"))return;db.users=db.users.filter(u=>u.id!==id);db.groups=db.groups.map(g=>g.ustadzId===id?{...g,ustadzId:""}:g);db.students=db.students.map(s=>s.ustadzId===id?{...s,ustadzId:""}:s);save();render()}

function downloadPDF(){
  if(!window.jspdf?.jsPDF)return toast("PDF belum siap. Periksa koneksi internet lalu coba lagi.","error");
  const type=$(".tab.active")?.dataset.type||"pekanan", {ss,rs}=reportData(type);
  const doc=new window.jspdf.jsPDF({unit:"mm",format:"a4"});
  doc.setFillColor(15,118,110);doc.rect(0,0,210,30,"F");
  doc.setTextColor(255,255,255);doc.setFontSize(16);doc.text("REKAP PERKEMBANGAN HALAQOH TAHFIDZ",14,13);
  doc.setFontSize(9);doc.text(type.toUpperCase()+" · "+new Date().toLocaleDateString("id-ID"),14,21);
  doc.setTextColor(30,50,46);doc.setFontSize(10);doc.text("Pengelola: "+me().name,14,42);doc.text("Jumlah Santri: "+ss.length,14,49);doc.text("Total Setoran: "+rs.length,100,49);
  let y=62;doc.setFillColor(232,244,241);doc.rect(10,y-6,190,9,"F");doc.setTextColor(25,65,59);doc.text("No",13,y);doc.text("Nama Santri",25,y);doc.text("Setoran",105,y);doc.text("Rata-rata",130,y);doc.text("Hafalan Terakhir",157,y);y+=8;
  ss.forEach((s,i)=>{if(y>275){doc.addPage();y=18}const a=rs.filter(r=>r.studentId===s.id),last=a[a.length-1],av=a.length?(a.reduce((x,r)=>x+r.score,0)/a.length).toFixed(1):"—";doc.setTextColor(30,50,46);doc.text(String(i+1),13,y);doc.text(s.name.slice(0,27),25,y);doc.text(String(a.length),105,y);doc.text(av,130,y);doc.text(last?(last.surah+" "+last.ayat).slice(0,25):"—",157,y);y+=7});
  const safe=type+"-"+new Date().toISOString().slice(0,10);doc.save("Rekap-Halaqoh-"+safe+".pdf");toast("PDF berhasil diunduh")
}

function render(){
  if(!meUser)return;
  nav();
  const admin=me().role==="admin";
  let p=location.hash.slice(1)||"dashboard";
  const allowed=admin?["dashboard","students","groups","users","records","reports"]:["dashboard","students","records","reports"];
  if(!allowed.includes(p))p="dashboard";
  const pages={dashboard,students,groups,users,records,reports};
  $("#view").innerHTML=pages[p]();
  if(p==="reports"){
    $$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("#report").innerHTML=reportHTML(b.dataset.type)});
  }
}
window.studentModal=studentModal;window.userModal=userModal;window.groupModal=groupModal;window.recordModal=recordModal;window.delStudent=delStudent;window.delUser=delUser;window.downloadPDF=downloadPDF;window.closeModal=closeModal;
})();
