---
layout: default
title: Persamaan Panas 1D
parent: Perpindahan Kalor
grand_parent: Kalor dan Termodinamika
nav_order: 5
---

# Persamaan Panas 1D
Skema beda hingga FTCS menghitung suhu tiap sel dari suhu tetangganya pada langkah sebelumnya.

{% include sim.html id="persamaan-panas" %}

$$T_i^{n+1} = T_i^n + r\,(T_{i+1}^n - 2T_i^n + T_{i-1}^n)$$

{: .note }
> - Dengan kedua ujung terisolasi, suhu rata-rata tetap konstan.
> - Dua ujung bersuhu tetap menghasilkan profil tunak linear 100→0 °C.
> - Garis tipis menunjukkan profil tunak untuk batas yang dipilih.

{: .try }
> - Pada kecepatan 0,25×, naikkan $$r$$ ke 0,51; amati zig-zag yang tumbuh.
> - Pakai titik panas di tengah, lalu ganti satu ujung menjadi suhu tetap.

{: .assume }
> - Batang 1 m, 50 sel, $$D = 10^{-4}$$ m²/s, sisi samping terisolasi.
> - Waktu dipercepat: tiap 1/240 s maju $$\Delta t = r\Delta x^2/D$$.
> - Bila maks $$|T|$$ melebihi $$10^4$$ °C, perhitungan dibekukan.
