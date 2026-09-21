---
layout: default
title: Tanah yang Tidak Nol
parent: Rangkaian DC
grand_parent: Elektronika
nav_order: 5
---

# Tanah yang Tidak Nol
"Tanah" hanya nol di satu titik; arus besar pada kawat kembali bersama mengangkat tanah lokal dan merusak pembacaan sensor.

{% include sim.html id="loop-tanah" %}

$$V_{G'} = (I_m + I_s)\,R_g, \qquad V_{\text{ADC}} = V_s + V_{G'}$$

{: .note }
> - Setiap kali motor hidup, pembacaan ADC melonjak sebesar $$I_m R_g$$.
> - Sensor sendiri tidak berubah; yang bergeser adalah acuannya.
> - Topologi bintang membuat $$V_{G'}$$ hampir nol.

{: .try }
> - Dengan $$I_m = 2$$ A dan $$R_g = 0{,}5$$ Ω, berapa galat yang muncul? Cocokkan dengan grafik.
> - Ganti ke topologi bintang. Berapa galat yang tersisa dan dari mana asalnya?

{: .assume }
> - Motor hidup 0,5 s dan mati 0,5 s bergantian.
> - Arus sensor tetap 10 mA; kawat lain tanpa hambatan.
> - ADC ideal, mengacu ke tanah catu daya.
