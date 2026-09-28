---
layout: default
title: Siklus Mesin Kalor
parent: Mesin Kalor dan Entropi
grand_parent: Kalor dan Termodinamika
nav_order: 1
---

# Siklus Mesin Kalor
Mesin kalor mengubah sebagian kalor menjadi kerja; batas efisiensinya hanya ditentukan kedua suhu reservoir.

{% include sim.html id="mesin-kalor" %}

$$\eta = 1 - \frac{T_C}{T_H}$$

{: .note }
> - Luas loop adalah $$W$$ bersih; ruas jingga menyerap, biru membuang kalor.
> - Otto bersuhu puncak $$T_H$$ tetap kalah efisien dari Carnot.
> - Klaim di atas batas Carnot membuat $$\Delta S_{semesta}$$ negatif.

{: .try }
> - Naikkan $$T_H$$ ke 1200 K; bagaimana $$\eta$$ dan luas loop berubah?
> - Pilih Otto: mengapa $$\eta$$ Otto selalu di bawah Carnot pada $$T_H$$, $$T_C$$ sama?

{: .assume }
> - Gas ideal 1 mol; Carnot monoatomik, Otto udara $$\gamma$$ = 1,4.
> - $$Q_H$$, $$Q_C$$, $$W$$ diintegrasikan sepanjang siklus kuasi-statik.
> - Grafik pendingin menampilkan KP, bukan efisiensi.
