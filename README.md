# Halaqoh Tahfidz — Final

Versi siap upload ke GitHub Pages. Semua file berada di root agar mudah di-upload lewat HP.

## Struktur
- `index.html`
- `app.js`
- `style.css`
- `README.md`

## Fitur
- Data santri kosong saat pertama kali digunakan.
- Hanya Admin yang dapat menambah/menghapus santri.
- Admin membuat akun Ustadz.
- Admin membuat kelompok dan menentukan Ustadz.
- Ustadz hanya melihat santri binaannya.
- Pencatatan setoran hafalan.
- Rekap pekanan, bulanan, dan semester.
- Admin dan Ustadz dapat mengunduh PDF.
- PDF Ustadz otomatis terbatas pada santri binaannya.
- UI responsif untuk HP dan desktop.

## Demo
Admin: `admin` / `admin123`  
Ustadz: `ustadz` / `ustadz123`

## GitHub Pages
Upload ke root repository, lalu buka Settings → Pages → Deploy from branch → `main` → `/ (root)`.

## Catatan
Ini aplikasi frontend statis. Data demo disimpan di browser menggunakan localStorage. Untuk sistem produksi multi-perangkat diperlukan backend/database dan autentikasi server.
