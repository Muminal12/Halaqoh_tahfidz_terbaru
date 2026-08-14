(()=>{"use strict";
const SUPABASE_URL="https://wcnblqtyupqrvnisquev.supabase.co";
const SUPABASE_KEY="sb_publishable_kEaT52pxurL9ZDnsMOLv3Q_lKFLN7DF";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
let meUser=null,profile=null,data={students:[],groups:[],records:[],profiles:[]};
const surahs=["Al-Fatihah","Al-Baqarah","Ali 'Imran","An-Nisa'","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Taubah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra'","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya'","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Asy-Syu'ara'","An-Naml","Al-Qasas","Al-'Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba'","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Asy-Syura","Az-Zukhruf","Ad-Dukhan","Al-Jasiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Az-Zariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadilah","Al-Hasyr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Tagabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddassir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba'","An-Nazi'at","'Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Insyiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Gasyiyah","Al-Fajr","Al-Balad","Asy-Syams","Al-Lail","Ad-Duha","Asy-Syarh","At-Tin","Al-'Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-'Adiyat","Al-Qari'ah","At-Takatsur","Al-'Asr","Al-Humazah","Al-Fil","Quraisy","Al-Ma'un","Al-Kausar","Al-Kafirun","An-Nasr","Al-Lahab","Al-Ikhlas","Al-Falaq","An-Nas"];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function toast(m,bad=false){let t=$("#toast");t.textContent=m;t.style.background=bad?"#a52a21":"";t.className="toast show";clearTimeout(window.__t);window.__t=setTimeout(()=>t.className="toast",5000)}
function dbError(e,context="Gagal menyimpan"){let msg=e?.message||e?.error_description||String(e||"Kesalahan tidak diketahui");toast(context+": "+msg,true);console.error(context,e)}
function closeModal(){$("#modal").innerHTML=""}
function modal(title,body,fn){$("#modal").innerHTML=`<div class="modalbg" id="modalbg"><div class="modalcard"><div class="modalhead"><h2>${title}</h2><button class="icon-btn" type="button" data-close>×</button></div><form id="mf">${body}<div class="actions"><button type="button" class="btn" data-close>Batal</button><button type="submit" id="modalSave" class="btn primary">Simpan</button></div></form></div></div>`;let b=$("#modalbg"),f=$("#mf"),saveBtn=$("#modalSave"),busy=false;$$("[data-close]",b).forEach(x=>x.onclick=closeModal);b.onclick=e=>e.target===b&&closeModal();async function submit(){if(busy)return;if(!f.checkValidity()){f.reportValidity();return}busy=true;saveBtn.disabled=true;saveBtn.textContent="Menyimpan…";try{await fn(f)}catch(e){dbError(e,"Gagal menyimpan")}finally{busy=false;if(document.body.contains(saveBtn)){saveBtn.disabled=false;saveBtn.textContent="Simpan"}}}f.onsubmit=e=>{e.preventDefault();submit()};saveBtn.onclick=e=>{e.preventDefault();submit()}}
function visibleStudents(){return profile.role==="admin"?data.students:data.students.filter(s=>s.ustadz_id===meUser)}
function nameOf(id){return data.profiles.find(x=>x.id===id)?.name||"Belum ditentukan"}
function groupOf(id){return data.groups.find(x=>x.id===id)?.name||"Belum dikelompokkan"}
function localDate(d=new Date()){let x=new Date(d.getTime()-d.getTimezoneOffset()*60000);return x.toISOString().slice(0,10)}
async function seedInitialStudents(){
if(profile?.role!=="admin"||localStorage.getItem("halaqoh_seed_students_v1")==="1")return;
const names=['Amri Yusron Salim', 'Arkan Azka', 'Bari Alzahran', 'Fahman Ibadurrahman', 'Fikry Akbar', 'Haikal Afham Permana', "M. Ja'far Aly", 'M. Salman Rasyad', 'Mikail Rasyid Riandy', 'Muadz Abdul Malik', 'Nino Haikal Fallah', 'Razka Aufa Garot', 'Rifqi Arya Nadindra', 'Rizki Agiliano Ramadhan', 'Daniyal Aqila Natamihardja'];
const existing=new Set(data.students.map(s=>(s.name||"").trim().toLowerCase()));
const missing=names.filter(n=>!existing.has(n.toLowerCase()));
if(!missing.length){localStorage.setItem("halaqoh_seed_students_v1","1");return}
const rows=missing.map(name=>({id:crypto.randomUUID(),name,class_name:"",group_id:null,ustadz_id:null}));
const {error}=await sb.from("students").insert(rows);
if(error){dbError(error,"Gagal menambahkan daftar santri awal");return}
localStorage.setItem("halaqoh_seed_students_v1","1");
await loadData();
toast(missing.length+" santri awal berhasil ditambahkan");
}
async function loadData(){let [a,b,c,d]=await Promise.all([sb.from("students").select("*").order("name"),sb.from("groups").select("*").order("name"),sb.from("records").select("*").order("record_date",{ascending:false}),sb.from("profiles").select("*")]);for(const x of[a,b,c,d])if(x.error)throw x.error;data={students:a.data||[],groups:b.data||[],records:c.data||[],profiles:d.data||[]}}
function showErr(x){$("#loginError").textContent=x;$("#loginError").classList.remove("hidden")}
async function login(){
let email=$("#username").value.trim(),p=$("#password").value;
if(SUPABASE_KEY.startsWith("PASTE_"))return showErr("Publishable key Supabase belum diisi.");
let {data:d,error}=await sb.auth.signInWithPassword({email,password:p});
if(error)return showErr(error.message==="Invalid login credentials"?"Email atau password salah.":error.message);
meUser=d.user.id;
let {data:prof,error:pe}=await sb.from("profiles").select("*").eq("id",d.user.id).maybeSingle();
if(pe)return showErr(pe.message);
if(!prof)return showErr("Akun berhasil login, tetapi profil belum dibuat di tabel profiles.");
profile=prof;
await enter()
}
async function enter(){try{await loadData();await seedInitialStudents();$("#login").classList.add("hidden");$("#app").classList.remove("hidden");render()}catch(e){showErr(e.message||"Gagal terhubung ke Supabase.")}}
async function logout(){
await sb.auth.signOut();
meUser=null;profile=null;sessionStorage.removeItem("halaqoh_profile");
$("#app").classList.add("hidden");$("#login").classList.remove("hidden");$("#password").value=""
}
function nav(){let admin=profile.role==="admin",items=admin?[["dashboard","⌂","Dashboard"],["students","♙","Santri"],["groups","◈","Kelompok"],["users","♟","Akun Ustadz"],["records","✎","Setoran"],["reports","▣","Rekap"]]:[["dashboard","⌂","Dashboard"],["students","♙","Santri Binaan"],["records","✎","Setoran"],["reports","▣","Rekap"]],p=location.hash.slice(1)||"dashboard";$("#nav").innerHTML=items.map(i=>`<button class="nav-item ${p===i[0]?"active":""}" data-p="${i[0]}"><span class="nav-icon">${i[1]}</span>${i[2]}</button>`).join("");$$(".nav-item").forEach(b=>b.onclick=()=>{location.hash=b.dataset.p;$("#sidebar").classList.remove("open")});let q=(profile.name||"U")[0].toUpperCase();$("#who-name").textContent=profile.name;$("#who-role").textContent=admin?"Administrator":"Ustadz";$("#avatar").textContent=q;$("#top-name").textContent=profile.name;$("#top-role").textContent=admin?"Administrator":"Ustadz";$("#top-avatar").textContent=q;$("#top-date").textContent=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
function head(t,s,a=""){return `<div class="page-head"><div><span class="eyebrow">HALAQOH TAHFIDZ</span><h1>${t}</h1><p>${s}</p></div><div class="head-actions">${a}</div></div>`}
function stat(i,n,v,s){return `<div class="stat"><div class="stat-icon">${i}</div><span>${n}</span><b>${v}</b><small>${s}</small></div>`}
function dashboard(){let ss=visibleStudents(),rs=data.records.filter(r=>ss.some(s=>s.id===r.student_id)),z=rs.filter(r=>r.type==="Ziyadah").length,m=rs.filter(r=>r.type==="Murajaah").length,av=rs.length?(rs.reduce((a,r)=>a+r.score,0)/rs.length).toFixed(1):"—";return head("Dashboard","Ringkasan perkembangan halaqoh Anda.")+`<div class="stats"><div class="stat"><div class="stat-icon">🔄</div><span>Wajib Murajaah</span><b>${ss.filter(s=>studentNeedMurajaah(s.id)).length}</b><small>santri harus mengulang</small></div>${stat("♙","Santri",ss.length,"santri terdaftar")}${stat("✎","Total Setoran",rs.length,"catatan hafalan")}${stat("↗","Ziyadah",z,"setoran baru")}${stat("↻","Murajaah",m,"pengulangan")}</div><div class="grid2"><section class="panel"><div class="panel-title"><h2>Setoran terbaru</h2><button class="text-btn" onclick="location.hash='records'">Lihat semua →</button></div>${rs.slice(0,5).map(r=>{let s=ss.find(x=>x.id===r.student_id);return `<div class="list-row"><div class="avatar">${esc((s?.name||"?")[0])}</div><div style="flex:1"><b>${esc(s?.name||"—")}</b><small>${esc(r.type)} · ${esc(r.from_surah)} ${esc(r.from_ayat)} → ${esc(r.to_surah)} ${esc(r.to_ayat)}</small></div><strong class="score">${r.score}</strong></div>`}).join("")||`<div class="empty">Belum ada setoran.</div>`}</section><section class="panel"><div class="panel-title"><h2>Ringkasan nilai</h2></div><div class="list-row"><span>Rata-rata nilai</span><b class="score">${av}</b></div><div class="list-row"><span>Sangat baik (90+)</span><b>${rs.filter(r=>r.score>=90).length}</b></div><div class="list-row"><span>Perlu murajaah (&lt;80)</span><b>${rs.filter(r=>r.score<80).length}</b></div><div class="quick" style="margin-top:12px"><button onclick="recordModal()">＋ Catat Setoran Baru</button></div></section></div>`}
function students(){let a=profile.role==="admin",ss=visibleStudents();return head(a?"Data Santri":"Santri Binaan",a?"Tambah santri dulu, lalu kelompokkan dengan pilihan yang mudah.":"Daftar santri yang dibina oleh Anda.",a?`<button class="btn primary" onclick="studentModal()">＋ Tambah Santri</button>`:"")+`<section class="panel"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kelas</th><th>Kelompok</th><th>Ustadz</th><th>Setoran</th>${a?"<th>Aksi</th>":""}</tr></thead><tbody>${ss.map(s=>`<tr><td><b>${esc(s.name)}</b></td><td>${esc(s.class_name||"—")}</td><td>${esc(groupOf(s.group_id))}</td><td>${esc(nameOf(s.ustadz_id))}</td><td>${data.records.filter(r=>r.student_id===s.id).length}</td>${a?`<td><button class="btn" style="padding:7px 10px;background:#eef5f2;color:#285b51" onclick="assignGroupModal('${s.id}')">${s.group_id?"Ubah Kelompok":"Pilih Kelompok"}</button> <button class="btn" style="padding:7px 10px;background:#fff1ef;color:#a52a21" onclick="delStudent('${s.id}')">Hapus</button></td>`:""}</tr>`).join("")||`<tr><td colspan="${a?6:5}" class="empty">Belum ada santri.</td></tr>`}</tbody></table></div></section>`}
function assignGroupModal(studentId){let s=data.students.find(x=>x.id===studentId);if(!s)return;let gs=data.groups;if(!gs.length)return toast("Belum ada kelompok. Buat kelompok dulu, lalu pilih kelompok dari daftar santri.",true);modal("Pilih Kelompok",`<div class="formgrid"><label>Santri<input value="${esc(s.name)}" disabled></label><label>Kelompok<select name="groupId"><option value="">Belum dikelompokkan</option>${gs.map(g=>`<option value="${g.id}" ${g.id===s.group_id?"selected":""}>${esc(g.name)} — ${esc(nameOf(g.ustadz_id))}</option>`).join("")}</select></label></div>`,async f=>{let g=data.groups.find(x=>x.id===f.groupId.value);let {error}=await sb.from("students").update({group_id:g?.id||null,ustadz_id:g?.ustadz_id||null}).eq("id",studentId);if(error)return dbError(error,"Gagal mengubah kelompok");closeModal();await loadData();toast(g?`Santri masuk kelompok ${g.name}`:"Santri dilepas dari kelompok");render()})}

function groups(){return head("Kelompok Halaqoh","Atur kelompok dan ustadz pembina.",`<button class="btn primary" onclick="groupModal()">＋ Buat Kelompok</button>`)+`<section class="cards">${data.groups.map(g=>`<div class="card"><span class="eyebrow">HALAQOH</span><h3>${esc(g.name)}</h3><p>Ustadz pembina<br><b>${esc(nameOf(g.ustadz_id))}</b></p><b>${data.students.filter(s=>s.group_id===g.id).length} santri</b></div>`).join("")||`<div class="empty">Belum ada kelompok.</div>`}</section>`}
function users(){let us=data.profiles.filter(u=>u.role==="ustadz");return head("Akun Ustadz","Kelola akun pembina halaqoh.",`<button class="btn primary" onclick="userModal()">＋ Buat Akun</button>`)+`<section class="cards">${us.map(u=>`<div class="card"><div class="avatar">${esc((u.name||"U")[0])}</div><h3>${esc(u.name)}</h3><p>Ustadz • akun Supabase Auth</p><button class="btn" style="background:#fff1ef;color:#a52a21" onclick="delUser('${u.id}')">Hapus akun</button></div>`).join("")||`<div class="empty">Belum ada akun ustadz.</div>`}</section>`}

function recordResult(r){
  const m=String(r.note||"").match(/^\\[\\[RESULT:(Lancar|Tidak Lancar)\\]\\]\\s*/);
  return m?m[1]:"";
}
function cleanNote(note){
  return String(note||"").replace(/^\\[\\[RESULT:(Lancar|Tidak Lancar)\\]\\]\\s*/,"");
}
function studentNeedMurajaah(studentId, targetDate=null){
  const rs=[...data.records].filter(r=>r.student_id===studentId)
    .sort((a,b)=>String(b.record_date).localeCompare(String(a.record_date)));
  const last=rs[0];
  if(!last || last.type!=="Ziyadah" || recordResult(last)!=="Tidak Lancar") return false;
  // A failed Ziyadah may be retried on the same calendar date.
  if(targetDate && String(last.record_date)===String(targetDate)) return false;
  return true;
}
function recordModal(){
let ss=visibleStudents();
if(!ss.length)return toast("Belum ada santri. Tambahkan santri terlebih dahulu.",true);
let opts=surahs.map((s,i)=>`<option value="${i}">${i+1}. ${s}</option>`).join("");
modal("Catat Setoran Hafalan",`<div class="formgrid">
<label>Santri<select name="studentId">${ss.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></label>
<label>Jenis Setoran<select name="type"><option value="Ziyadah">📖 Ziyadah — Hafalan baru</option><option value="Murajaah">🔄 Murajaah — Mengulang hafalan</option></select></label>
<label>Dari Surat<select name="from">${opts}</select></label>
<label>Dari Ayat<input name="fromAyat" required placeholder="Contoh: 1"></label>
<label>Sampai Surat<select name="to">${opts}</select></label>
<label>Sampai Ayat<input name="toAyat" required placeholder="Contoh: 10"></label>
<label>Tanggal<input name="date" type="date" required value="${localDate()}"></label>
<label>Nilai<select name="score"><option value="90">90 — Sangat Baik</option><option value="80">80 — Baik</option><option value="70">70 — Cukup</option><option value="60">60 — Perlu Murajaah</option></select></label>
<label>Hasil Setoran<select name="result"><option value="Lancar">✅ Lancar</option><option value="Tidak Lancar">❌ Tidak Lancar</option></select></label>
<label>Catatan<input name="note" placeholder="Catatan ustadz"></label>
</div>
<div id="murajaahNotice" style="display:none;margin-top:10px;padding:10px;border-radius:10px;background:#fff4df;color:#805c19;font-size:13px;font-weight:700"></div>`,
async f=>{
let student=ss.find(s=>s.id===f.studentId.value);
if(!student)return toast("Santri tidak ditemukan.",true);
let locked=studentNeedMurajaah(student.id,f.date.value);
if(locked && f.type.value!=="Murajaah")return toast("Santri ini wajib Murajaah terlebih dahulu.",true);
let fi=+f.from.value,ti=+f.to.value;
if(ti<fi)return toast("Surat sampai tidak boleh sebelum surat dari.",true);

let {error}=await sb.from("records").insert({
id:crypto.randomUUID(),student_id:f.studentId.value,ustadz_id:meUser,
type:f.type.value,from_surah:surahs[fi],from_ayat:f.fromAyat.value.trim(),
to_surah:surahs[ti],to_ayat:f.toAyat.value.trim(),score:+f.score.value,
note:`[[RESULT:${f.result.value}]] ${f.note.value.trim()}`.trim(),record_date:f.date.value
});
if(error)return dbError(error,"Gagal menyimpan setoran");
closeModal();await loadData();
toast(f.result.value==="Tidak Lancar"?"Setoran tersimpan. Santri wajib Murajaah mulai hari berikutnya.":"Setoran berhasil disimpan");
render()
});
let sel=$("#mf [name=studentId]"),type=$("#mf [name=type]"),date=$("#mf [name=date]"),notice=$("#murajaahNotice");
function sync(){
let locked=studentNeedMurajaah(sel.value,date.value);
if(locked){
type.value="Murajaah";
type.querySelector('option[value="Ziyadah"]').disabled=true;
notice.style.display="block";
notice.textContent="🔒 Santri ini wajib Murajaah. Ziyadah baru dibuka kembali setelah Murajaah Lancar.";
}else{
type.querySelector('option[value="Ziyadah"]').disabled=false;
notice.style.display="none";
}
}
sel.onchange=sync;date.onchange=sync;date.oninput=sync;sync();
}
function records(){
let ss=visibleStudents(),rs=data.records.filter(r=>ss.some(s=>s.id===r.student_id)).sort((a,b)=>String(b.record_date).localeCompare(String(a.record_date)));
return head("Setoran Hafalan","Pantau ziyadah dan murajaah secara terstruktur.",`<button class="btn primary" onclick="recordModal()">＋ Catat Setoran</button>`)
+`<section class="panel"><div class="table-wrap"><table><thead><tr><th>Tanggal</th><th>Santri</th><th>Jenis</th><th>Rentang Hafalan</th><th>Nilai</th><th>Hasil</th><th>Catatan</th><th>Aksi</th></tr></thead><tbody>
${rs.map(r=>`<tr><td>${esc(r.record_date)}</td><td><b>${esc(ss.find(s=>s.id===r.student_id)?.name||"—")}</b></td><td><b style="color:${r.type==="Ziyadah"?"var(--g)":"#a87522"}">${esc(r.type)}</b></td><td>${esc(r.from_surah)} ${esc(r.from_ayat)} → ${esc(r.to_surah)} ${esc(r.to_ayat)}</td><td class="score">${r.score}</td><td><b style="color:${recordResult(r)==="Lancar"?"var(--green)":"#a52a21"}">${esc(recordResult(r)||"—")}</b></td><td>${esc(cleanNote(r.note)||"—")}</td><td><button class="btn" style="padding:7px 10px;background:#fff1ef;color:#a52a21" onclick="delRecord('${r.id}')">Hapus</button></td></tr>`).join("")||`<tr><td colspan="8" class="empty">Belum ada setoran.</td></tr>`}
</tbody></table></div></section>`}
async function delRecord(id){
if(!confirm("Hapus catatan setoran ini?"))return;
let {error}=await sb.from("records").delete().eq("id",id);
if(error)return dbError(error,"Gagal menghapus setoran");
await loadData();toast("Setoran berhasil dihapus");render();
}
function reports(){let ss=visibleStudents(),rs=data.records.filter(r=>ss.some(s=>s.id===r.student_id));return head("Rekap Perkembangan","Laporan ringkas dan siap dicetak.",`<button class="btn primary" onclick="pdf()">↓ Unduh PDF</button>`)+`<section class="panel"><div class="report-summary"><div><span>Total Santri</span><b>${ss.length}</b></div><div><span>Total Setoran</span><b>${rs.length}</b></div><div><span>Ziyadah</span><b>${rs.filter(r=>r.type==="Ziyadah").length}</b></div><div><span>Murajaah</span><b>${rs.filter(r=>r.type==="Murajaah").length}</b></div></div><div class="table-wrap"><table><thead><tr><th>Santri</th><th>Ziyadah</th><th>Murajaah</th><th>Rata-rata</th><th>Hafalan terakhir</th></tr></thead><tbody>${ss.map(s=>{let x=rs.filter(r=>r.student_id===s.id),av=x.length?(x.reduce((a,r)=>a+r.score,0)/x.length).toFixed(1):"—",last=x[0];return `<tr><td><b>${esc(s.name)}</b></td><td>${x.filter(r=>r.type==="Ziyadah").length}</td><td>${x.filter(r=>r.type==="Murajaah").length}</td><td class="score">${av}</td><td>${last?esc(last.from_surah)+" "+esc(last.from_ayat)+" → "+esc(last.to_surah)+" "+esc(last.to_ayat):"—"}</td></tr>`}).join("")||`<tr><td colspan="5" class="empty">Belum ada data.</td></tr>`}</tbody></table></div></section>`}
function studentModal(){modal("Tambah Santri",`<div class="formgrid"><label>Nama Lengkap<input name="name" required placeholder="Nama santri"></label><label>Kelas<input name="className" placeholder="Contoh: 9C"></label></div><p style="font-size:12px;color:#64756f;margin:8px 0 0">Santri bisa ditambahkan dulu tanpa kelompok. Setelah itu gunakan tombol <b>Pilih Kelompok</b> di daftar santri.</p>`,async f=>{let payload={id:crypto.randomUUID(),name:f.name.value.trim(),class_name:f.className.value.trim(),group_id:null,ustadz_id:null};let {error}=await sb.from("students").insert(payload);if(error)return dbError(error,"Gagal menyimpan santri");closeModal();await loadData();toast("Santri berhasil ditambahkan");render()})}

function userModal(){
modal("Buat Akun Ustadz",`<div class="formgrid"><label>Nama Lengkap<input name="name" required></label><label>Email<input name="email" type="email" required placeholder="ustadz@email.com"></label><label>Password<input name="password" type="password" minlength="6" required placeholder="Minimal 6 karakter"></label></div><p style="font-size:12px;color:#64756f;margin:8px 0 0">Akun dibuat melalui Supabase Auth. Jika konfirmasi email aktif, ustadz perlu mengonfirmasi email sebelum login.</p>`,async f=>{
let adminSession=(await sb.auth.getSession()).data.session;
let email=f.email.value.trim(),password=f.password.value,name=f.name.value.trim();
let {data:created,error}=await sb.auth.signUp({email,password});
if(error)return dbError(error,"Gagal membuat akun ustadz");
let newId=created.user?.id;
if(!newId)return toast("Akun Auth tidak mendapatkan User ID.",true);

// Restore admin session if signUp returned a different/no session.
if(adminSession?.access_token&&adminSession?.refresh_token){
  await sb.auth.setSession({access_token:adminSession.access_token,refresh_token:adminSession.refresh_token});
}
let {error:pe}=await sb.from("profiles").insert({id:newId,name,role:"ustadz",created_at:new Date().toISOString()});
if(pe){
  await sb.auth.setSession({access_token:adminSession?.access_token||"",refresh_token:adminSession?.refresh_token||""});
  return dbError(pe,"Akun dibuat tetapi profil gagal disimpan");
}
closeModal();await loadData();toast(created.session?"Akun ustadz berhasil dibuat dan siap login.":"Akun ustadz dibuat. Jika konfirmasi email aktif, cek email ustadz.");render()
})}
function groupModal(){let us=data.profiles.filter(u=>u.role==="ustadz");if(!us.length)return toast("Buat akun ustadz terlebih dahulu.",true);modal("Buat Kelompok Halaqoh",`<div class="formgrid"><label>Nama Kelompok<input name="name" required></label><label>Ustadz Pembina<select name="ustadzId">${us.map(u=>`<option value="${u.id}">${esc(u.name)}</option>`).join("")}</select></label></div>`,async f=>{let {error}=await sb.from("groups").insert({id:crypto.randomUUID(),name:f.name.value.trim(),ustadz_id:f.ustadzId.value});if(error)return dbError(error,"Gagal menyimpan kelompok");closeModal();await loadData();toast("Kelompok berhasil dibuat");render()})}
async function delStudent(id){if(!confirm("Hapus santri beserta setoran terkait?"))return;await sb.from("records").delete().eq("student_id",id);let {error}=await sb.from("students").delete().eq("id",id);if(error)return toast(error.message,true);await loadData();render()}
async function delUser(id){if(!confirm("Hapus akun ustadz ini?"))return;let {error}=await sb.from("profiles").delete().eq("id",id);if(error)return toast(error.message,true);await loadData();render()}
function pdf(){
if(!window.jspdf?.jsPDF){
let s=document.createElement("script");
s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
s.onload=pdf;document.head.appendChild(s);return;
}
const {jsPDF}=window.jspdf;
const doc=new jsPDF({unit:"mm",format:"a4"});
const ss=visibleStudents();
const rs=data.records.filter(r=>ss.some(s=>s.id===r.student_id)).sort((a,b)=>String(a.record_date).localeCompare(String(b.record_date)));
const today=localDate();
const W=210, H=297;
const green=[7,63,54], light=[235,247,242], ink=[35,70,63], muted=[105,120,116], red=[165,42,33], gold=[168,117,34];

function header(title,subtitle){
doc.setFillColor(...green);doc.rect(0,0,W,32,"F");
doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");doc.setFontSize(19);doc.text("HALAQOH TAHFIDZ",15,13);
doc.setFont("helvetica","normal");doc.setFontSize(8.5);doc.text("ONLINE MANAGEMENT • LAPORAN PERKEMBANGAN",15,21);
doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(title,195,13,{align:"right"});
doc.setFont("helvetica","normal");doc.setFontSize(7.5);doc.text(subtitle,195,21,{align:"right"});
}
function footer(page,total){
doc.setDrawColor(220,228,225);doc.line(15,284,195,284);
doc.setTextColor(...muted);doc.setFontSize(7);
doc.text("Dokumen resmi • Aplikasi Halaqoh Tahfidz Online",15,290);
doc.text(`Halaman ${page} / ${total}`,195,290,{align:"right"});
}
function card(x,y,w,h,label,value){
doc.setFillColor(...light);doc.roundedRect(x,y,w,h,3,3,"F");
doc.setTextColor(...muted);doc.setFont("helvetica","normal");doc.setFontSize(7);doc.text(label,x+5,y+7);
doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text(String(value),x+5,y+17);
}
function barChart(x,y,w,h,labels,values,title){
doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(title,x,y-5);
const max=Math.max(1,...values), base=y+h-12, bw=(w-25)/labels.length-7;
doc.setDrawColor(205,218,213);doc.line(x+20,base,x+w,base);
labels.forEach((lab,i)=>{
 const bh=(h-25)*(values[i]/max), bx=x+25+i*((w-25)/labels.length), by=base-bh;
 doc.setFillColor(...green);doc.roundedRect(bx,by,bw,bh,1.5,1.5,"F");
 doc.setTextColor(...ink);doc.setFontSize(8);doc.text(String(values[i]),bx+bw/2,by-2,{align:"center"});
 doc.setTextColor(...muted);doc.setFontSize(6.5);doc.text(lab,bx+bw/2,base+6,{align:"center"});
});
}
function lineChart(x,y,w,h,labels,values,title){
doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(title,x,y-5);
const max=Math.max(100,...values), min=0, px=x+15, py=y+8, pw=w-25, ph=h-25;
doc.setDrawColor(220,228,225);
for(let k=0;k<=4;k++){let gy=py+ph-k*ph/4;doc.line(px,gy,px+pw,gy);}
if(!values.length)return;
let pts=values.map((v,i)=>[px+(values.length===1?pw/2:i*pw/(values.length-1)),py+ph-(v-min)/(max-min)*ph]);
doc.setDrawColor(...green);doc.setLineWidth(1.1);
for(let i=1;i<pts.length;i++)doc.line(pts[i-1][0],pts[i-1][1],pts[i][0],pts[i][1]);
doc.setFillColor(...green);
pts.forEach((p,i)=>{doc.circle(p[0],p[1],1.5,"F");doc.setTextColor(...ink);doc.setFontSize(6.5);doc.text(labels[i],p[0],py+ph+7,{align:"center"});});
doc.setLineWidth(.2);
}

header("REKAP PERKEMBANGAN","Ringkasan hafalan & performa santri");
doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text("Ringkasan Laporan",15,45);
doc.setFont("helvetica","normal");doc.setFontSize(8);doc.setTextColor(...muted);
doc.text(`Pengelola: ${profile.name||"—"}`,15,51);
doc.text(`Tanggal laporan: ${new Date(today+"T00:00:00").toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"})}`,15,56);

const z=rs.filter(r=>r.type==="Ziyadah").length,m=rs.filter(r=>r.type==="Murajaah").length;
const lancar=rs.filter(r=>recordResult(r)==="Lancar").length,tidak=rs.filter(r=>recordResult(r)==="Tidak Lancar").length;
const avg=rs.length?(rs.reduce((a,r)=>a+r.score,0)/rs.length).toFixed(1):"—";
card(15,64,40,25,"TOTAL SANTRI",ss.length);card(60,64,40,25,"TOTAL SETORAN",rs.length);
card(105,64,40,25,"ZIYADAH",z);card(150,64,45,25,"MURAJAAH",m);
card(15,94,40,25,"RATA-RATA NILAI",avg);card(60,94,40,25,"LANCAR",lancar);
card(105,94,40,25,"TIDAK LANCAR",tidak);card(150,94,45,25,"WAJIB MURAJAAH",ss.filter(s=>studentNeedMurajaah(s.id)).length);

barChart(15,140,85,65,["Ziyadah","Murajaah"],[z,m],"Komposisi Setoran");
const monthNames=["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const now=new Date(), monthly=[];
for(let k=5;k>=0;k--){let d=new Date(now.getFullYear(),now.getMonth()-k,1), key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;monthly.push({lab:monthNames[d.getMonth()],val:rs.filter(r=>String(r.record_date).startsWith(key)).length});}
barChart(110,140,85,65,monthly.map(x=>x.lab),monthly.map(x=>x.val),"Tren Jumlah Setoran • 6 Bulan");
const scoreBuckets=[rs.filter(r=>r.score>=90).length,rs.filter(r=>r.score>=80&&r.score<90).length,rs.filter(r=>r.score>=70&&r.score<80).length,rs.filter(r=>r.score<70).length];
barChart(15,218,85,55,["90+","80–89","70–79","<70"],scoreBuckets,"Distribusi Nilai");
const monthlyAvg=monthly.map(x=>{let key=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;return 0});
lineChart(110,218,85,55,monthly.map(x=>x.lab),monthly.map(x=>{let d=new Date(now.getFullYear(),now.getMonth()-5+monthly.indexOf(x),1),key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,a=rs.filter(r=>String(r.record_date).startsWith(key));return a.length?Math.round(a.reduce((s,r)=>s+r.score,0)/a.length):0}),"Tren Rata-rata Nilai");

footer(1,2);
doc.addPage();
header("DETAIL SANTRI","Rekap per santri");
let y=44;
doc.setFillColor(...light);doc.roundedRect(10,y-7,190,11,2,2,"F");
doc.setTextColor(...ink);doc.setFont("helvetica","bold");doc.setFontSize(7.5);
["No","Nama Santri","Kelas","Ziyadah","Murajaah","Lancar","Rata-rata","Status"].forEach((h,i)=>doc.text(h,[13,24,82,102,123,145,164,184][i],y));
y+=9;doc.setFont("helvetica","normal");
ss.forEach((s,i)=>{
 if(y>275){footer(2,3);doc.addPage();header("DETAIL SANTRI","Rekap per santri");y=44;}
 const x=rs.filter(r=>r.student_id===s.id),av=x.length?(x.reduce((a,r)=>a+r.score,0)/x.length).toFixed(1):"—";
 const status=studentNeedMurajaah(s.id)?"Wajib Murajaah":"Normal";
 doc.setTextColor(...ink);doc.text(String(i+1),13,y);doc.text((s.name||"—").slice(0,30),24,y);doc.text((s.class_name||"—").slice(0,10),82,y);
 doc.text(String(x.filter(r=>r.type==="Ziyadah").length),102,y);doc.text(String(x.filter(r=>r.type==="Murajaah").length),123,y);
 doc.text(String(x.filter(r=>recordResult(r)==="Lancar").length),145,y);doc.text(String(av),164,y);
 doc.setTextColor(...(status==="Normal"?green:red));doc.text(status,184,y);y+=7;
});
footer(2,2);
doc.save("Rekap-Halaqoh-Profesional-"+today+".pdf");
}
function render(){if(!profile)return;nav();let admin=profile.role==="admin",p=location.hash.slice(1)||"dashboard",pages={dashboard,students,groups,users,records,reports},allowed=admin?Object.keys(pages):["dashboard","students","records","reports"];$("#view").innerHTML=pages[allowed.includes(p)?p:"dashboard"]()}
$("#loginForm").onsubmit=e=>{e.preventDefault();login()};$("#togglePassword").onclick=()=>{$("#password").type=$("#password").type==="password"?"text":"password";$("#togglePassword").textContent=$("#password").type==="password"?"Lihat":"Sembunyikan"};$("#logout").onclick=logout;$("#menu").onclick=()=>$("#sidebar").classList.toggle("open");window.addEventListener("hashchange",render);document.addEventListener("keydown",e=>e.key==="Escape"&&closeModal());Object.assign(window,{studentModal,assignGroupModal,userModal,groupModal,recordModal,delStudent,delUser,delRecord,pdf,closeModal});
(async()=>{
let {data:{session}}=await sb.auth.getSession();
if(session?.user){
meUser=session.user.id;
let {data:d}=await sb.from("profiles").select("*").eq("id",meUser).maybeSingle();
if(d){profile=d;await enter()}
}
})();})();