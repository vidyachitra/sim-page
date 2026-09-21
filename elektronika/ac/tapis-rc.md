---
layout: default
title: Tapis RC
parent: Arus Bolak-Balik
grand_parent: Elektronika
nav_order: 2
---

# Tapis RC
Satu resistor dan satu kapasitor sudah membentuk tapis: mengambil keluaran di $$C$$ melewatkan frekuensi rendah, di $$R$$ melewatkan frekuensi tinggi.

{% include sim.html id="tapis-rc" %}

$$f_c = \frac{1}{2\pi RC}, \qquad |H_{LP}| = \frac{1}{\sqrt{1 + (f/f_c)^2}}, \qquad |H_{HP}| = \frac{f/f_c}{\sqrt{1 + (f/f_c)^2}}$$

{: .note }
> - Di $$f = f_c$$ keluaran tinggal 70,7 % (−3 dB) dan tergeser 45°.
> - Jauh di atas $$f_c$$, lolos-rendah turun 20 dB tiap dekade.
> - Kurva Bode bergeser saat $$R$$ atau $$C$$ diubah; bentuknya tetap.

{: .try }
> - Set $$f = f_c$$. Cocokkan amplitudo keluaran dengan 0,707 $$V_m$$.
> - Ganti ke lolos-tinggi pada $$f$$ yang sama. Apa yang terjadi pada fase keluaran?

{: .assume }
> - Sumber ideal; tanpa beban di keluaran.
> - Penguatan dari keadaan tunak; kurva waktu memuat transien awal singkat.
> - Tampilan diperlambat 1000 kali.
