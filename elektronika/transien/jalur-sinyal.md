---
layout: default
title: Pengaruh Jalur Sinyal
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 6
---

# Pengaruh Jalur Sinyal
Kawat dan jalur PCB punya induktansi dan kapasitansi parasit; tepi sinyal digital yang tegak berubah jadi berdering atau melambat.

{% include sim.html id="jalur-sinyal" %}

$$Z_0 = \sqrt{\frac{L_t}{C_t}}, \qquad \zeta = \frac12\left(\frac{R_t}{Z_0} + \frac{Z_0}{R_L}\right)$$

{: .note }
> - Beban besar ($$R_L \gg Z_0$$): tepi berdering dan melewati 3,3 V.
> - $$R_L \approx Z_0$$: dering hilang, tepi bersih (terminasi).
> - $$L_t$$ atau $$C_t$$ lebih besar: dering lebih lambat dan lebih lama.

{: .try }
> - Turunkan $$R_L$$ sampai mendekati $$Z_0$$. Berapa persen lonjakan lewat yang tersisa?
> - Naikkan $$f$$ ke 50 MHz. Apakah penerima masih sempat mencapai 3,3 V?

{: .assume }
> - Jalur = parasit tergumpal $$R_t$$, $$L_t$$, $$C_t$$; bukan saluran transmisi terdistribusi.
> - Pengirim ideal 3,3 V dengan tepi tegak.
> - Tampilan diperlambat $$10^8$$ kali; sumbu waktu dalam ns.
