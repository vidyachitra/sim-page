---
layout: default
title: Hambatan Dalam Sumber
parent: Rangkaian DC
grand_parent: Elektronika
nav_order: 4
---

# Hambatan Dalam Sumber
Tegangan terminal baterai turun saat arus beban naik, karena sebagian GGL hilang di hambatan dalamnya.

{% include sim.html id="hambatan-dalam" %}

$$V = \varepsilon - I r, \qquad I = \frac{\varepsilon}{r + R_L}$$

{: .note }
> - Garis $$V$$ selalu di bawah $$\varepsilon$$ kecuali saat $$r = 0$$.
> - Sisipan: titik kerja bergerak sepanjang garis berlereng $$-r$$.
> - $$P_L$$ maksimum saat $$R_L = r$$, tetapi setengah daya hilang di dalam.

{: .try }
> - Kecilkan $$R_L$$ sampai $$V$$ tinggal setengah $$\varepsilon$$. Bandingkan $$R_L$$ dengan $$r$$.
> - Set $$r = 0$$. Apa yang terjadi pada arus hubung singkat?

{: .assume }
> - Baterai = GGL ideal seri $$r$$ tetap.
> - Kawat tanpa hambatan; keadaan tunak.
> - Sisipan digambar sampai arus hubung singkat $$\varepsilon/r$$.
