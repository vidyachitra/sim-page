---
layout: default
title: Motor DC Nonlinier
parent: Motor DC
grand_parent: Elektronika
nav_order: 1
---

# Motor DC Nonlinier
Tegangan jangkar mendorong arus yang menghasilkan torsi menjenuh, memutar rotor melawan beban.

{% include sim.html id="motor-dc-nonlinier" %}

$$\tau_{em} = K_t I_{sat} \tanh(i / I_{sat})$$

{: .note }
> - Arus melonjak saat start karena GGL-balik masih nol.
> - Torsi menjenuh saat arus melewati I_sat, membatasi torsi awal.
> - Menaikkan beban menurunkan kecepatan tunak dan menaikkan arus tunak.

{: .try }
> - Naikkan I_sat lalu turunkan lagi: bandingkan lonjakan arus dan torsi awal saat start?
> - Turunkan V ke 0 saat motor berputar cepat, amati torsi menjadi negatif.

{: .assume }
> - GGL-balik linear terhadap ω; hanya torsi yang menjenuh.
> - Gesekan Coulomb dan beban dihaluskan agar berlawanan arah putaran.
> - Induktansi bocor dan efek sikat/komutator diabaikan.
