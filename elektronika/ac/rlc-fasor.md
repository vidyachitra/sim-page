---
layout: default
title: Impedansi dan Fasor RLC
parent: Arus Bolak-Balik
grand_parent: Elektronika
nav_order: 1
---

# Impedansi dan Fasor RLC
Pada sumber sinus, tegangan induktor dan kapasitor saling berlawanan fase; selisihnya bersama $$R$$ menentukan impedansi dan beda fase arus.

{% include sim.html id="rlc-fasor" %}

$$|Z| = \sqrt{R^2 + (X_L - X_C)^2}, \qquad \tan\varphi = \frac{X_L - X_C}{R}, \qquad f_0 = \frac{1}{2\pi\sqrt{LC}}$$

{: .note }
> - $$v_L$$ dan $$v_C$$ selalu berlawanan; keduanya bisa jauh lebih besar dari sumber.
> - Di $$f_0$$ fasor $$V_L$$ dan $$V_C$$ saling meniadakan: arus maksimum, $$\varphi = 0$$.
> - Daya sesaat negatif berarti energi kembali ke sumber.

{: .try }
> - Geser $$f$$ melewati $$f_0$$. Kapan arus berpindah dari tertinggal ke mendahului?
> - Kecilkan $$R$$ di $$f_0$$. Berapa kali $$v_C$$ melebihi $$V_m$$?

{: .assume }
> - Komponen ideal; sumber sinus ideal.
> - Fasor dari keadaan tunak; kurva waktu memuat transien awal sebentar.
> - Tampilan diperlambat 1000 kali; $$f$$ dalam kHz.
