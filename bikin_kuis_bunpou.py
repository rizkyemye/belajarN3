#!/usr/bin/env python3
"""Bikin bunpou_quiz.json dari data.json (materi bunpou per hari).

Aturan:
- Tiap hari punya 5 pola bunpou (entri data.json yang diawali 〜).
- Tiap hari dibuat 10 soal:
    * Soal 1 per pola  -> "isian" (kalimat contoh dikosongkan di bagian polanya)
      kalau polanya tidak muncul apa adanya di kalimat, otomatis jadi soal arti.
    * Soal 2 per pola  -> "arti" (pilih arti yang tepat).
- Opsi jawaban selalu 4, diacak, dan tidak ada yang kembar.

Jalankan:  python3 bikin_kuis_bunpou.py
Hasil   :  bunpou_quiz.json
"""
import json
import random
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent
DATA = BASE / "data.json"
APP = BASE / "app.js"
OUT = BASE / "bunpou_quiz.json"
MARK = "【Contoh Kalimat】"
RANDOM_SEED = 20260919  # biar hasilnya stabil tiap kali dijalankan


def baca_rumus():
    """Ambil tabel BUNPOU_RUMUS yang ditanam di app.js."""
    teks = APP.read_text(encoding="utf-8")
    awal = teks.find("const BUNPOU_RUMUS")
    if awal == -1:
        return {}
    blok = teks[awal:]
    akhir = blok.find("\n};")
    blok = blok[: akhir if akhir != -1 else len(blok)]
    rumus = {}
    for pola, isi in re.findall(r'"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"', blok):
        rumus[pola] = isi.replace('\\"', '"')
    return rumus


def pecah_back(back):
    """Back -> (arti, kalimat jp, terjemahan id)."""
    teks = back or ""
    potong = teks.find(MARK)
    arti = (teks if potong == -1 else teks[:potong]).strip()
    sisa = "" if potong == -1 else teks[potong + len(MARK) :].strip()
    baris = [b.strip() for b in sisa.splitlines() if b.strip()]
    jp = baris[0] if baris else ""
    idn = baris[1] if len(baris) > 1 else ""
    return arti, jp, idn


def inti_pola(pola):
    """〜について -> について (dibuang tanda gelombang & teks dalam kurung)."""
    inti = re.sub(r"^[〜～\u301c\uff5e]+", "", pola).strip()
    inti = re.sub(r"[（(][^）)]*[）)]", "", inti).strip()
    return inti


def acak(daftar, seed):
    return random.Random(seed).sample(daftar, len(daftar))


def main():
    entri = json.loads(DATA.read_text(encoding="utf-8"))
    rumus = baca_rumus()

    semua = [e for e in entri if str(e.get("front", "")).strip().startswith(("〜", "～", "\u301c", "\uff5e"))]
    per_hari = {}
    for e in semua:
        per_hari.setdefault(int(e["day"]), []).append(e)

    semua_pola = []
    for hari in sorted(per_hari):
        for e in per_hari[hari]:
            p = e["front"].strip()
            if p not in semua_pola:
                semua_pola.append(p)

    hasil = {}
    laporan = []
    for hari in sorted(per_hari):
        daftar = per_hari[hari]
        bentuk = []
        for e in daftar:
            pola = e["front"].strip()
            arti, jp, idn = pecah_back(e.get("back", ""))
            rms = rumus.get(pola, "")
            inti = inti_pola(pola)
            jp_bersih = re.sub(r"<[^>]+>", "", jp)

            # --- Soal 1: isian (kalau pola muncul di kalimat) ---
            pos = jp_bersih.find(inti) if inti else -1
            if pos != -1:
                kalimat_soal = jp_bersih[:pos] + "（　）" + jp_bersih[pos + len(inti) :]
                pengecoh = [p for p in semua_pola if p != pola]
                # utamakan pengecoh dari hari yang sama
                sekandang = [d["front"].strip() for d in daftar if d["front"].strip() != pola]
                pilih = acak(sekandang, f"{hari}-{pola}-a")[:3]
                if len(pilih) < 3:
                    sisa = [p for p in acak(pengecoh, f"{hari}-{pola}-b") if p not in pilih]
                    pilih += sisa[: 3 - len(pilih)]
                opsi = acak([pola] + pilih, f"{hari}-{pola}-c")
                bentuk.append(
                    {
                        "jenis": "isian",
                        "soal": kalimat_soal,
                        "opsi": opsi,
                        "jawab": opsi.index(pola),
                        "pola": pola,
                        "arti": arti,
                        "rumus": rms,
                        "contoh": jp_bersih,
                        "terjemah": idn,
                        "petunjuk": "Pilih pola yang tepat untuk mengisi （　）",
                    }
                )
            else:
                # --- fallback: soal arti (pola tidak muncul apa adanya) ---
                arti_lain = [pecah_back(d.get("back", ""))[0] for d in daftar if d["front"].strip() != pola]
                arti_lain = [a for a in arti_lain if a and a != arti]
                if len(arti_lain) < 3:
                    arti_lain += [
                        pecah_back(x.get("back", ""))[0]
                        for x in semua
                        if x["front"].strip() != pola and pecah_back(x.get("back", ""))[0] not in arti_lain
                    ]
                pilih = acak(arti_lain, f"{hari}-{pola}-d")[:3]
                if arti and all(a != arti for a in pilih):
                    opsi = acak([arti] + pilih, f"{hari}-{pola}-e")
                    bentuk.append(
                        {
                            "jenis": "arti",
                            "soal": f"「{pola}」",
                            "opsi": opsi,
                            "jawab": opsi.index(arti),
                            "pola": pola,
                            "arti": arti,
                            "rumus": rms,
                            "contoh": jp_bersih,
                            "terjemah": idn,
                            "petunjuk": "Pilih arti yang tepat",
                        }
                    )

            # --- Soal 2: kalau soal 1 berbentuk isian → tanya arti.
            #     Kalau soal 1 berbentuk arti (pola tak muncul di kalimat) →
            #     tanya arah sebaliknya (arti → pola), biar tidak dobel.
            pakai_isian = bool(bentuk) and bentuk[-1]["jenis"] == "isian" and bentuk[-1]["pola"] == pola
            arti_lain = [pecah_back(d.get("back", ""))[0] for d in daftar if d["front"].strip() != pola]
            arti_lain = [a for a in arti_lain if a and a != arti]
            if len(arti_lain) < 3:
                arti_lain += [
                    pecah_back(x.get("back", ""))[0]
                    for x in semua
                    if x["front"].strip() != pola and pecah_back(x.get("back", ""))[0] not in arti_lain
                ]
            pilih = acak(arti_lain, f"{hari}-{pola}-f")[:3]
            if arti and all(a != arti for a in pilih):
                opsi = acak([arti] + pilih, f"{hari}-{pola}-g")
                if pakai_isian:
                    bentuk.append(
                        {
                            "jenis": "arti",
                            "soal": f"「{pola}」",
                            "opsi": opsi,
                            "jawab": opsi.index(arti),
                            "pola": pola,
                            "arti": arti,
                            "rumus": rms,
                            "contoh": jp_bersih,
                            "terjemah": idn,
                            "petunjuk": "Pilih arti yang tepat",
                        }
                    )
                else:
                    # arah balik: arti → pola
                    pola_lain = [x["front"].strip() for x in semua if x["front"].strip() != pola]
                    pola_lain = [x for x in pola_lain if x not in pilih]
                    pilih_pola = acak(pola_lain, f"{hari}-{pola}-h")[:3]
                    opsi2 = acak([pola] + pilih_pola, f"{hari}-{pola}-i")
                    bentuk.append(
                        {
                            "jenis": "balik",
                            "soal": arti,
                            "opsi": opsi2,
                            "jawab": opsi2.index(pola),
                            "pola": pola,
                            "arti": arti,
                            "rumus": rms,
                            "contoh": jp_bersih,
                            "terjemah": idn,
                            "petunjuk": "Pola mana yang punya arti ini?",
                        }
                    )

        hasil[str(hari)] = bentuk
        laporan.append((hari, len(daftar), len(bentuk)))

    OUT.write_text(json.dumps(hasil, ensure_ascii=False, indent=None), encoding="utf-8")

    print("hari | pola | soal")
    for hari, pola, soal in laporan:
        print(f"  {hari:>3} | {pola:>4} | {soal:>3}")
    total_soal = sum(s for _, _, s in laporan)
    print(f"TOTAL: {len(laporan)} hari, {total_soal} soal")
    # pemeriksaan
    masalah = 0
    for hari, daftar in hasil.items():
        if len(daftar) != 10:
            print(f"  ! hari {hari}: {len(daftar)} soal (harus 10)")
            masalah += 1
        for i, s in enumerate(daftar):
            if len(s["opsi"]) != 4 or len(set(s["opsi"])) != 4:
                print(f"  ! hari {hari} soal {i+1}: opsi tidak 4 unik")
                masalah += 1
            if not (0 <= s["jawab"] < len(s["opsi"])):
                print(f"  ! hari {hari} soal {i+1}: indeks jawaban salah")
                masalah += 1
            if s["opsi"][s["jawab"]] != (s["arti"] if s["jenis"] == "arti" else s["pola"]):
                print(f"  ! hari {hari} soal {i+1}: jawaban tidak cocok")
                masalah += 1
        pasangan = [(s["jenis"], s["soal"]) for s in daftar]
        if len(set(pasangan)) != len(pasangan):
            print(f"  ! hari {hari}: ada soal kembar")
            masalah += 1
    print("masalah:", masalah, "" if masalah == 0 else "(perlu diperiksa)")
    return 0 if masalah == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
