'use strict';
/* =========================================================
   Daftar 114 Surat Al-Qur'an
   Dipakai untuk mengisi dropdown "Dari Surat" / "Sampai Surat"
   pada form Setoran. Urutan = urutan mushaf (nomor surat).
   ========================================================= */
var SURAH_LIST = [
  { no: 1, name: "Al-Fatihah", ayahCount: 7 },
  { no: 2, name: "Al-Baqarah", ayahCount: 286 },
  { no: 3, name: "Ali 'Imran", ayahCount: 200 },
  { no: 4, name: "An-Nisa'", ayahCount: 176 },
  { no: 5, name: "Al-Ma'idah", ayahCount: 120 },
  { no: 6, name: "Al-An'am", ayahCount: 165 },
  { no: 7, name: "Al-A'raf", ayahCount: 206 },
  { no: 8, name: "Al-Anfal", ayahCount: 75 },
  { no: 9, name: "At-Taubah", ayahCount: 129 },
  { no: 10, name: "Yunus", ayahCount: 109 },
  { no: 11, name: "Hud", ayahCount: 123 },
  { no: 12, name: "Yusuf", ayahCount: 111 },
  { no: 13, name: "Ar-Ra'd", ayahCount: 43 },
  { no: 14, name: "Ibrahim", ayahCount: 52 },
  { no: 15, name: "Al-Hijr", ayahCount: 99 },
  { no: 16, name: "An-Nahl", ayahCount: 128 },
  { no: 17, name: "Al-Isra'", ayahCount: 111 },
  { no: 18, name: "Al-Kahf", ayahCount: 110 },
  { no: 19, name: "Maryam", ayahCount: 98 },
  { no: 20, name: "Ta-Ha", ayahCount: 135 },
  { no: 21, name: "Al-Anbiya'", ayahCount: 112 },
  { no: 22, name: "Al-Hajj", ayahCount: 78 },
  { no: 23, name: "Al-Mu'minun", ayahCount: 118 },
  { no: 24, name: "An-Nur", ayahCount: 64 },
  { no: 25, name: "Al-Furqan", ayahCount: 77 },
  { no: 26, name: "Asy-Syu'ara'", ayahCount: 227 },
  { no: 27, name: "An-Naml", ayahCount: 93 },
  { no: 28, name: "Al-Qasas", ayahCount: 88 },
  { no: 29, name: "Al-'Ankabut", ayahCount: 69 },
  { no: 30, name: "Ar-Rum", ayahCount: 60 },
  { no: 31, name: "Luqman", ayahCount: 34 },
  { no: 32, name: "As-Sajdah", ayahCount: 30 },
  { no: 33, name: "Al-Ahzab", ayahCount: 73 },
  { no: 34, name: "Saba'", ayahCount: 54 },
  { no: 35, name: "Fatir", ayahCount: 45 },
  { no: 36, name: "Ya-Sin", ayahCount: 83 },
  { no: 37, name: "As-Saffat", ayahCount: 182 },
  { no: 38, name: "Sad", ayahCount: 88 },
  { no: 39, name: "Az-Zumar", ayahCount: 75 },
  { no: 40, name: "Ghafir", ayahCount: 85 },
  { no: 41, name: "Fussilat", ayahCount: 54 },
  { no: 42, name: "Asy-Syura", ayahCount: 53 },
  { no: 43, name: "Az-Zukhruf", ayahCount: 89 },
  { no: 44, name: "Ad-Dukhan", ayahCount: 59 },
  { no: 45, name: "Al-Jasiyah", ayahCount: 37 },
  { no: 46, name: "Al-Ahqaf", ayahCount: 35 },
  { no: 47, name: "Muhammad", ayahCount: 38 },
  { no: 48, name: "Al-Fath", ayahCount: 29 },
  { no: 49, name: "Al-Hujurat", ayahCount: 18 },
  { no: 50, name: "Qaf", ayahCount: 45 },
  { no: 51, name: "Az-Zariyat", ayahCount: 60 },
  { no: 52, name: "At-Tur", ayahCount: 49 },
  { no: 53, name: "An-Najm", ayahCount: 62 },
  { no: 54, name: "Al-Qamar", ayahCount: 55 },
  { no: 55, name: "Ar-Rahman", ayahCount: 78 },
  { no: 56, name: "Al-Waqi'ah", ayahCount: 96 },
  { no: 57, name: "Al-Hadid", ayahCount: 29 },
  { no: 58, name: "Al-Mujadalah", ayahCount: 22 },
  { no: 59, name: "Al-Hasyr", ayahCount: 24 },
  { no: 60, name: "Al-Mumtahanah", ayahCount: 13 },
  { no: 61, name: "As-Saff", ayahCount: 14 },
  { no: 62, name: "Al-Jumu'ah", ayahCount: 11 },
  { no: 63, name: "Al-Munafiqun", ayahCount: 11 },
  { no: 64, name: "At-Taghabun", ayahCount: 18 },
  { no: 65, name: "At-Talaq", ayahCount: 12 },
  { no: 66, name: "At-Tahrim", ayahCount: 12 },
  { no: 67, name: "Al-Mulk", ayahCount: 30 },
  { no: 68, name: "Al-Qalam", ayahCount: 52 },
  { no: 69, name: "Al-Haqqah", ayahCount: 52 },
  { no: 70, name: "Al-Ma'arij", ayahCount: 44 },
  { no: 71, name: "Nuh", ayahCount: 28 },
  { no: 72, name: "Al-Jinn", ayahCount: 28 },
  { no: 73, name: "Al-Muzzammil", ayahCount: 20 },
  { no: 74, name: "Al-Muddassir", ayahCount: 56 },
  { no: 75, name: "Al-Qiyamah", ayahCount: 40 },
  { no: 76, name: "Al-Insan", ayahCount: 31 },
  { no: 77, name: "Al-Mursalat", ayahCount: 50 },
  { no: 78, name: "An-Naba'", ayahCount: 40 },
  { no: 79, name: "An-Nazi'at", ayahCount: 46 },
  { no: 80, name: "'Abasa", ayahCount: 42 },
  { no: 81, name: "At-Takwir", ayahCount: 29 },
  { no: 82, name: "Al-Infitar", ayahCount: 19 },
  { no: 83, name: "Al-Mutaffifin", ayahCount: 36 },
  { no: 84, name: "Al-Insyiqaq", ayahCount: 25 },
  { no: 85, name: "Al-Buruj", ayahCount: 22 },
  { no: 86, name: "At-Tariq", ayahCount: 17 },
  { no: 87, name: "Al-A'la", ayahCount: 19 },
  { no: 88, name: "Al-Ghasyiyah", ayahCount: 26 },
  { no: 89, name: "Al-Fajr", ayahCount: 30 },
  { no: 90, name: "Al-Balad", ayahCount: 20 },
  { no: 91, name: "Asy-Syams", ayahCount: 15 },
  { no: 92, name: "Al-Lail", ayahCount: 21 },
  { no: 93, name: "Ad-Duha", ayahCount: 11 },
  { no: 94, name: "Asy-Syarh", ayahCount: 8 },
  { no: 95, name: "At-Tin", ayahCount: 8 },
  { no: 96, name: "Al-'Alaq", ayahCount: 19 },
  { no: 97, name: "Al-Qadr", ayahCount: 5 },
  { no: 98, name: "Al-Bayyinah", ayahCount: 8 },
  { no: 99, name: "Az-Zalzalah", ayahCount: 8 },
  { no: 100, name: "Al-'Adiyat", ayahCount: 11 },
  { no: 101, name: "Al-Qari'ah", ayahCount: 11 },
  { no: 102, name: "At-Takasur", ayahCount: 8 },
  { no: 103, name: "Al-'Asr", ayahCount: 3 },
  { no: 104, name: "Al-Humazah", ayahCount: 9 },
  { no: 105, name: "Al-Fil", ayahCount: 5 },
  { no: 106, name: "Quraisy", ayahCount: 4 },
  { no: 107, name: "Al-Ma'un", ayahCount: 7 },
  { no: 108, name: "Al-Kausar", ayahCount: 3 },
  { no: 109, name: "Al-Kafirun", ayahCount: 6 },
  { no: 110, name: "An-Nasr", ayahCount: 3 },
  { no: 111, name: "Al-Lahab", ayahCount: 5 },
  { no: 112, name: "Al-Ikhlas", ayahCount: 4 },
  { no: 113, name: "Al-Falaq", ayahCount: 5 },
  { no: 114, name: "An-Nas", ayahCount: 6 }
];

/* Lookup cepat nomor surat <-> nama.
   Catatan penting: kolom from_surah/to_surah di Supabase bertipe TEXT,
   jadi yang disimpan ke database adalah NAMA surat (mis. "Al-Baqarah"),
   bukan nomor urutnya. Nomor urut hanya dipakai di sisi klien (JS) untuk
   validasi "surat sampai tidak boleh sebelum surat dari". */
var SURAH_NAME_BY_NUMBER = {};
var SURAH_NO_BY_NAME = {};
SURAH_LIST.forEach(function (s) {
  SURAH_NAME_BY_NUMBER[s.no] = s.name;
  SURAH_NO_BY_NAME[s.name] = s.no;
});

function surahOrderOf(name) {
  return SURAH_NO_BY_NAME.hasOwnProperty(name) ? SURAH_NO_BY_NAME[name] : null;
}

function surahOptionsHTML() {
  return SURAH_LIST.map(function (s) {
    return '<option value="' + s.name.replace(/"/g, '&quot;') + '">' + s.no + '. ' + s.name + '</option>';
  }).join('');
}
