---
layout: default
title: Penyearah Dioda
parent: Elektronika Dasar
grand_parent: Elektronika
nav_order: 1
---

# Penyearah Dioda
Dioda hanya menghantar saat sumber lebih tinggi dari kapasitor; kapasitor menahan tegangan di antara puncak sehingga keluaran hampir rata.

{% include sim.html id="penyearah" %}

$$V_{pp} \approx \frac{V_{\text{puncak}}}{f_{\text{riak}}\, R_L C}, \qquad f_{\text{riak}} = 50\ \text{Hz (setengah)},\ 100\ \text{Hz (penuh)}$$

{: .note }
> - Arus dioda berupa denyut pendek tepat di sekitar puncak.
> - Gelombang penuh mengisi dua kali per periode: riak setengahnya.
> - Puncak keluaran lebih rendah dari $$V_m$$ sebesar $$V_f$$ (atau $$2V_f$$ di jembatan).

{: .try }
> - Gandakan $$C$$. Apakah riak turun setengah? Bagaimana lebar denyut dioda?
> - Turunkan $$R_L$$ ke 0,1 kΩ. Mengapa riak membesar padahal $$C$$ tetap?

{: .assume }
> - Dioda: jatuh tegangan 0,7 V dan hambatan hantar 5 Ω.
> - Sumber 50 Hz ideal; riak diukur per siklus terakhir.
> - Tampilan diperlambat 100 kali.
