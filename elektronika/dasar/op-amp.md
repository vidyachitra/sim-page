---
layout: default
title: Penguat Op-Amp
parent: Elektronika Dasar
grand_parent: Elektronika
nav_order: 2
---

# Penguat Op-Amp
Umpan balik negatif memaksa kedua masukan op-amp bertegangan sama, sehingga penguatannya ditentukan resistor saja, sampai keluaran menyentuh catu.

{% include sim.html id="op-amp" %}

$$A_{inv} = -\frac{R_f}{R_{in}}, \qquad A_{non} = 1 + \frac{R_f}{R_{in}}, \qquad |v_{out}| \le V_{cc}$$

{: .note }
> - Selama linear, $$v(-)$$ menempel pada $$v(+)$$: ground maya pada inverting.
> - Keluaran inverting terbalik fase; non-inverting sefase.
> - Saat jenuh, puncak terpotong rata dan $$v(-)$$ lepas dari $$v(+)$$.

{: .try }
> - Naikkan $$V_m$$ sampai keluaran terpotong. Pada amplitudo berapa? Cocokkan dengan $$V_{cc}/|A|$$.
> - Set $$R_f = R_{in}$$ pada non-inverting. Berapa penguatannya?

{: .assume }
> - Op-amp ideal: arus masukan nol, penguatan terbuka tak hingga.
> - Keluaran dibatasi tepat di $$\pm V_{cc}$$.
> - Masukan sinus 1 kHz; tampilan diperlambat 1000 kali.
