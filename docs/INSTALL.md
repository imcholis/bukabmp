# Instalasi BMP Terbuka

## Persyaratan

- Google Chrome desktop yang mendukung Manifest V3.
- Akun Anda sendiri pada portal reader yang didukung.
- Telegram untuk aktivasi komunitas.
- Internet saat mengakses sumber dan saat aktivasi.

OCR sudah ada di dalam release ZIP.

## 1. Download release

Buka halaman **Releases** repo `imcholis/bukabmp`, lalu download asset:

```text
BMP-Terbuka-v<VERSION>.zip
```

Jangan download `Source code (zip)` jika tujuan Anda hanya memakai extension. Source checkout tidak membawa vendor OCR binary yang dibundel pada release.

## 2. Extract

Extract ZIP ke folder yang tidak akan dipindah-pindah, misalnya:

```text
D:\BMP-Terbuka\
```

## 3. Load extension

1. Buka `chrome://extensions`.
2. Aktifkan **Developer mode**.
3. Klik **Load unpacked**.
4. Pilih folder hasil extract yang berisi `manifest.json`.

## 4. Aktivasi komunitas

1. Klik icon **BMP Terbuka**.
2. Gabung **Buka BMP** dan **Group Terbuka**.
3. Klik **Verifikasi melalui Telegram**.
4. Selesaikan verifikasi pada bot.
5. Kembali ke extension. Popup akan memeriksa aktivasi otomatis.
6. Jika perlu gunakan **Cek sekarang**; bila pairing terlalu lama gunakan **Ulangi** untuk membuat pairing baru.

Aktivasi tidak meminta password/NIM/cookie portal sumber.

## 5. Gunakan

1. Login ke portal reader dengan akun Anda sendiri.
2. Pastikan tab reader sedang aktif.
3. Masukkan **Kode BMP**.
4. Pilih modul pertama dan terakhir.
5. Klik **Mulai**.

## Update

Karena instalasi dilakukan dengan **Load unpacked**, Chrome tidak memperbarui extension dari GitHub secara otomatis. Saat versi baru dirilis, download ZIP baru, extract ke folder baru, lalu reload/arahakan extension ke folder baru.
