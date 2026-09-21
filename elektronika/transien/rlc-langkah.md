---
layout: default
title: Respons Langkah RLC
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 3
---

# Respons Langkah RLC
Rasio redaman $$\zeta$$ menentukan apakah tegangan kapasitor berosilasi, tepat mendekat, atau merayap ke nilai akhirnya.

{% include sim.html id="rlc-langkah" %}

$$\omega_0 = \frac{1}{\sqrt{LC}}, \qquad \zeta = \frac{R}{2}\sqrt{\frac{C}{L}}$$

{: .note }
> - $$\zeta < 1$$: $$v_C$$ melewati $$V$$ lalu berosilasi mengecil.
> - $$\zeta = 1$$: mencapai $$V$$ paling cepat tanpa lewat.
> - Energi berpindah bolak-balik antara $$C$$ dan $$L$$; $$R$$ yang menguras totalnya.

{: .try }
> - Set $$R = 0$$. Apakah osilasi berhenti? Ke mana energinya?
> - Cari $$R$$ yang membuat $$\zeta = 1$$, lalu bandingkan dengan rumus di kanvas.

{: .assume }
> - Kapasitor kosong dan arus nol saat saklar ditutup.
> - Komponen ideal; sumber langkah ideal.
> - Tampilan diperlambat 1000 kali; periode alami sub-milidetik.
