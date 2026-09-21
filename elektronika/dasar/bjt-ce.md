---
layout: default
title: Penguat Transistor Emitor Bersama
parent: Elektronika Dasar
grand_parent: Elektronika
nav_order: 3
---

# Penguat Transistor Emitor Bersama
Arus basis kecil mengendalikan arus kolektor $$\beta$$ kali lebih besar; jatuh tegangan di $$R_C$$ menjadi keluaran yang terbalik fase.

{% include sim.html id="bjt-ce" %}

$$i_C = \beta\, i_B, \qquad v_{out} = V_{cc} - i_C R_C, \qquad A_v \approx -\beta\frac{R_C}{R_B}$$

{: .note }
> - Keluaran terbalik: $$v_{in}$$ naik, $$i_C$$ naik, $$V_{CE}$$ turun.
> - Titik Q di tengah garis beban memberi ayunan terbesar tanpa terpotong.
> - Terpotong di bawah saat jenuh (0,2 V), di atas saat putus ($$V_{cc}$$).

{: .try }
> - Geser $$V_{BB}$$ sampai Q di tengah garis beban, lalu naikkan $$V_m$$ sampai terpotong.
> - Gandakan $$\beta$$. Apa yang terjadi pada Q dan penguatan? Mengapa bias basis dianggap kurang stabil?

{: .assume }
> - Model garis-patah: $$V_{BE} = 0{,}7$$ V, $$V_{CE,sat} = 0{,}2$$ V.
> - $$V_{cc} = 12$$ V tetap; sinyal 1 kHz; tampilan diperlambat 1000 kali.
> - Tanpa kapasitor kopling dan resistor emitor.
