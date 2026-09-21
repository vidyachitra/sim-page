---
layout: default
title: Lonjakan Arus Kapasitor
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 5
---

# Lonjakan Arus Kapasitor
Kapasitor kosong tampak seperti hubung singkat saat pertama disambung; arusnya hanya dibatasi hambatan kawat.

{% include sim.html id="lonjakan-arus" %}

$$i(0^+) = \frac{V}{R_w + R_{pre}}, \qquad \tau = (R_w + R_{pre})\,C$$

{: .note }
> - Dengan $$R_{pre} = 0$$, puncak arus bisa ratusan ampere walau hanya sesaat.
> - Sekering lebur jika puncak melampaui $$5 I_f$$, meski arus tunak nol.
> - $$C$$ tidak mengubah puncak, hanya $$\tau$$; $$R_{pre}$$ kecil sudah menekannya.

{: .try }
> - Tutup saklar dengan $$R_{pre} = 0$$. Apakah sekering 5 A selamat?
> - Cari $$R_{pre}$$ terkecil yang menyelamatkan sekering, lalu lihat pengaruhnya pada $$\tau$$.

{: .assume }
> - Sumber tetap 12 V; kapasitor kosong saat saklar ditutup.
> - Sekering lebur seketika bila $$i > 5 I_f$$.
> - Grafik menahan puncak 0,5 ms karena lonjakan lebih sempit dari cuplikan.
