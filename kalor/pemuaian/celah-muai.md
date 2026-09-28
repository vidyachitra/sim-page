---
layout: default
title: Celah Muai Rel dan Jembatan
parent: Pemuaian
grand_parent: Kalor dan Termodinamika
nav_order: 3
---

# Celah Muai Rel dan Jembatan
Celah kecil antarsegmen memberi ruang bagi baja untuk memuai pada siang yang panas.

{% include sim.html id="celah-muai" %}

$$\Delta L = \alpha L_0 \Delta T$$

{: .note }
> - Celah menyempit siang hari dan melebar lagi pada malam hari.
> - Celah tertutup tepat saat $$T = T_{pasang} + g_0/(\alpha L_0)$$.
> - Setelah tertutup, tegangan naik sekitar 2,4 MPa per kelvin.

{: .try }
> - Atur celah 0 mm. Pada suhu berapa rel mulai melengkung?
> - Pasang rel pada pagi dingin, lalu pada siang panas. Bandingkan.

{: .assume }
> - Baja, $$\alpha = 1{,}2 \times 10^{-5}$$ /K dan $$E = 200$$ GPa.
> - Suhu harian sinusoidal 10 °C sampai $$T_{maks}$$; 1 s = 1 jam.
> - Setelah celah tertutup, muai tertahan penuh: $$\sigma = E\alpha\,\Delta T$$.
