---
layout: default
title: Pembagi Tegangan
parent: Rangkaian DC
grand_parent: Elektronika
nav_order: 1
---

# Pembagi Tegangan
Beban yang dipasang paralel dengan $$R_2$$ menurunkan tegangan keluaran; efeknya kecil hanya jika $$R_L \gg R_2$$.

{% include sim.html id="pembagi-tegangan" %}

$$V_{out} = V\,\frac{R_2 \parallel R_L}{R_1 + R_2 \parallel R_L}, \qquad R_2 \parallel R_L = \frac{R_2 R_L}{R_2 + R_L}$$

{: .note }
> - Garis "berbeban" selalu di bawah garis "tanpa beban".
> - Saat $$R_L = R_2$$, $$V_{out}$$ turun jauh dari nilai tanpa beban.
> - $$i_1 = i_2 + i_L$$: hukum arus Kirchhoff di simpul keluaran.

{: .try }
> - Turunkan $$R_L$$ sampai $$V_{out}$$ tinggal setengah nilai tanpa beban. Berapa $$R_L$$ saat itu?
> - Set $$R_1 = R_2 = 1$$ kΩ. Apakah beban 100 kΩ masih terasa?

{: .assume }
> - Sumber ideal, kawat tanpa hambatan.
> - Keadaan tunak; penggeser bekerja langsung.
> - Titik muatan hanya ilustrasi arah dan besar arus.
