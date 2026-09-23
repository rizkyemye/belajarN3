/* ../aset/doushi-engine.js — mesin ubah kata kerja Jepang (berbasis hiragana)
   Dipakai halaman web:  ubahKataKerja(kana, golongan, bentukId)
   Juga bisa diuji di Node:  node test-doushi.js  (lihat scripts/test-doushi.js)
   golongan: 1 = 五段 (godan), 2 = 一段 (ichidan), 3 = 不規則 (する・来る)
*/
(function (root) {
    "use strict";

    // baris vokal tiap akhiran: [a, i, u, e, o]
    const BARIS = {
        "う": ["わ", "い", "う", "え", "お"],
        "く": ["か", "き", "く", "け", "こ"],
        "ぐ": ["が", "ぎ", "ぐ", "げ", "ご"],
        "す": ["さ", "し", "す", "せ", "そ"],
        "つ": ["た", "ち", "つ", "て", "と"],
        "ぬ": ["な", "に", "ぬ", "ね", "の"],
        "ぶ": ["ば", "び", "ぶ", "べ", "ぼ"],
        "む": ["ま", "み", "む", "め", "も"],
        "る": ["ら", "り", "る", "れ", "ろ"]
    };
    const TE = { "う": "って", "つ": "って", "る": "って", "む": "んで", "ぶ": "んで", "ぬ": "んで",
                 "く": "いて", "ぐ": "いで", "す": "して" };
    const TA = { "う": "った", "つ": "った", "る": "った", "む": "んだ", "ぶ": "んだ", "ぬ": "んだ",
                 "く": "いた", "ぐ": "いだ", "す": "した" };

    const ICHIDAN = { masu: "ます", masen: "ません", mashita: "ました", masendeshita: "ませんでした",
        te: "て", ta: "た", nai: "ない", tai: "たい", kanou: "られる", ishi: "よう", meirei: "ろ",
        ukemi: "られる", shieki: "させる", jouken: "れば", teiru: "ている", shiekiukemi: "させられる",
        nakatta: "なかった", tara: "たら" };

    const SURU = { masu: "します", masen: "しません", mashita: "しました", masendeshita: "しませんでした",
        te: "して", ta: "した", nai: "しない", jisho: "する", tai: "したい", kanou: "できる", ishi: "しよう",
        meirei: "しろ", ukemi: "される", shieki: "させる", jouken: "すれば", teiru: "している",
        shiekiukemi: "させられる", nakatta: "しなかった", tara: "したら" };

    const KURU = { masu: "きます", masen: "きません", mashita: "きました", masendeshita: "きませんでした",
        te: "きて", ta: "きた", nai: "こない", jisho: "くる", tai: "きたい", kanou: "こられる", ishi: "こよう",
        meirei: "こい", ukemi: "こられる", shieki: "こさせる", jouken: "くれば", teiru: "きている",
        shiekiukemi: "こさせられる", nakatta: "こなかった", tara: "きたら" };

    // kata yang punya bentuk tidak beraturan khusus
    const KHUSUS = {
        "いく": { te: "いって", ta: "いった", tara: "いったら", teiru: "いっている" },
        "ある": { nai: "ない", nakatta: "なかった" }
    };

    function ubahKataKerja(kana, golongan, bentuk) {
        const k = String(kana || "").trim();
        if (!k) return "";
        if (bentuk === "jisho") return k;
        const g = Number(golongan) || 1;
        if (g === 3) {
            const dasar3 = k.endsWith("する") ? k.slice(0, -2) : "";
            const tabel = k.endsWith("くる") ? KURU : SURU;      // くる / する
            if (!k.endsWith("する") && !k.endsWith("くる")) return k;   // tidak dikenal
            return dasar3 + (tabel[bentuk] || "");
        }
        if (g === 2) {
            const d = k.endsWith("る") ? k.slice(0, -1) : k;
            return d + (ICHIDAN[bentuk] || "");
        }
        // golongan 1 (godan)
        if (KHUSUS[k] && KHUSUS[k][bentuk]) return KHUSUS[k][bentuk];
        const akhir = k.slice(-1), dasar = k.slice(0, -1);
        const b = BARIS[akhir];
        if (!b) return k;
        switch (bentuk) {
            case "masu": return dasar + b[1] + "ます";
            case "masen": return dasar + b[1] + "ません";
            case "mashita": return dasar + b[1] + "ました";
            case "masendeshita": return dasar + b[1] + "ませんでした";
            case "te": return dasar + (TE[akhir] || "");
            case "ta": return dasar + (TA[akhir] || "");
            case "nai": return dasar + b[0] + "ない";
            case "tai": return dasar + b[1] + "たい";
            case "kanou": return dasar + b[3] + "る";
            case "ishi": return dasar + b[4] + "う";
            case "meirei": return dasar + b[3];
            case "ukemi": return dasar + b[0] + "れる";
            case "shieki": return dasar + b[0] + "せる";
            case "shiekiukemi": return dasar + b[0] + "せられる";
            case "jouken": return dasar + b[3] + "ば";
            case "teiru": return ubahKataKerja(k, g, "te") + "いる";
            case "nakatta": return dasar + b[0] + "なかった";
            case "tara": return ubahKataKerja(k, g, "ta") + "ら";
            default: return k;
        }
    }

    // semua bentuk sekaligus (untuk tabel)
    const SEMUA = ["jisho", "masu", "masen", "mashita", "masendeshita", "te", "ta", "nai", "nakatta",
                   "tai", "kanou", "ishi", "meirei", "ukemi", "shieki", "shiekiukemi", "jouken", "tara", "teiru"];

    const API = { ubahKataKerja: ubahKataKerja, BENTUK_SEMUA: SEMUA };
    if (typeof module !== "undefined" && module.exports) module.exports = API;   // untuk uji di Node
    root.Doushi = API;
    if (typeof window !== "undefined") { window.ubahKataKerja = ubahKataKerja; window.DOUSHI_BENTUK = SEMUA; }
})(typeof globalThis !== "undefined" ? globalThis : this);
