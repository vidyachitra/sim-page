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
> - Torsi menjenuh saat arus melewati $$I_{sat}$$, membatasi torsi awal.
> - Beban besar dapat mengunci rotor: $$\tau_{em}$$ tak pernah melewati ambang tahan.

{: .try }
> - Naikkan beban sampai rotor terkunci, lalu turunkan sampai rotor lepas lagi.
> - Turunkan V ke 0 saat motor berputar cepat, amati torsi menjadi negatif.

{: .assume }
> - GGL-balik linear terhadap ω; hanya torsi yang menjenuh.
> - Rotor terkunci diam selama $$\tau_{em}$$ tak lewati gesekan Coulomb + beban.
> - Induktansi bocor dan efek sikat/komutator diabaikan.
