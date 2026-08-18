'use strict';
/* =========================================================
   KONFIGURASI SUPABASE
   =========================================================
   Ganti dua nilai di bawah ini dengan milik project Supabase
   kamu sendiri:

   1. url     -> Project Settings > API > Project URL
   2. anonKey -> Project Settings > API > Project API keys
                 pakai kunci "anon" / "public" (BUKAN service_role)

   Kunci "anon" AMAN untuk ditaruh di kode frontend/GitHub Pages
   karena memang didesain publik dan dibatasi oleh Row Level
   Security (RLS) di sisi Supabase. JANGAN PERNAH menaruh
   "service_role" key di file ini atau di file manapun yang
   ter-upload ke GitHub — kunci itu bisa membaca/menulis/menghapus
   SELURUH database tanpa batas.
   ========================================================= */
window.SUPABASE_CONFIG = {
  url: 'https://wcnblqtyupqrvnisquev.supabase.co/rest/v1/',
  anonKey: 'sb_publishable_kEaT52pxurL9ZDnsMOLv3Q_lKFLN7DF'
};
