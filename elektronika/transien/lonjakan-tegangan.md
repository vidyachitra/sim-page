---
layout: default
title: Lonjakan Tegangan Induktor
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 4
---

# Lonjakan Tegangan Induktor
Memutus arus induktor secara mendadak memaksa $$di/dt$$ sangat besar, dan $$v_L = L\,di/dt$$ melonjak ratusan volt.

{% include sim.html id="lonjakan-tegangan" %}

$$v_L = L\frac{di}{dt}, \qquad v_{\text{saklar}} \approx \frac{V}{R}\,R_{\text{off}}$$

{: .note }
> - Tanpa dioda, tegangan saklar melonjak jauh di atas 12 V sumber.
> - Semakin besar $$R_{\text{off}}$$ (celah makin "terbuka"), semakin tinggi lonjakan.
> - Dengan dioda flyback, $$v_L$$ terkunci di $$-0{,}7$$ V dan arus meluruh pelan.

{: .try }
> - Tutup saklar, tunggu arus penuh, lalu buka. Berapa puncak $$v_{\text{saklar}}$$?
> - Ulangi dengan dioda. Ke mana energi $$\tfrac12 L i^2$$ sekarang?

{: .assume }
> - Saklar terbuka = hambatan celah $$R_{\text{off}}$$; sumber tetap 12 V.
> - Lonjakan nyata < 1 µs, jadi grafik menahan puncaknya selama 0,5 ms.
> - Dioda ideal dengan jatuh tegangan 0,7 V.
