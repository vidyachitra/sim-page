---
layout: default
title: Daya dan Faktor Daya
parent: Arus Bolak-Balik
grand_parent: Elektronika
nav_order: 3
---

# Daya dan Faktor Daya
Beban induktif menarik arus lebih besar dari yang diperlukan daya nyatanya; kapasitor paralel mengembalikan faktor daya mendekati satu.

{% include sim.html id="daya-ac" %}

$$P = \tfrac12 V_m I_m \cos\varphi, \qquad Q = \tfrac12 V_m I_m \sin\varphi, \qquad \text{pf} = \frac{P}{S}$$

{: .note }
> - Daya sesaat negatif: energi medan magnet dikembalikan ke sumber.
> - Menambah $$C_p$$ menurunkan $$Q$$ dan arus sumber, bukan $$P$$.
> - Terlalu banyak $$C_p$$ membuat beban kapasitif: $$Q$$ negatif.

{: .try }
> - Naikkan $$C_p$$ sampai faktor daya mendekati 1. Berapa arus sumber turun?
> - Set $$L = 0$$. Apakah daya sesaat masih pernah negatif?

{: .assume }
> - Sumber 50 Hz ideal; beban $$R$$–$$L$$ seri tetap.
> - Nilai $$P$$, $$Q$$, $$S$$ dari keadaan tunak.
> - Tampilan diperlambat 100 kali; periode 20 ms.
