---
layout: default
title: Gesekan Statis dan Kinetis
parent: Dinamika
grand_parent: Fisika Mekanika
nav_order: 2
---

# Gesekan Statis dan Kinetis
Balok baru bergerak saat tarikan melampaui gesekan statis maksimum; setelah itu gesekan kinetis yang bekerja.

{% include sim.html id="gesekan" %}

$$\mu_s = \frac{m_g}{M}, \qquad \mu_k = \frac{m_g g - (M + m_g)\,a}{M g}$$

{: .note }
> - Selama diam, $$f_s$$ persis sama dengan $$m_g g$$: grafiknya berimpit.
> - Begitu $$m_g g$$ melewati $$\mu_s M g$$, $$f$$ turun ke $$\mu_k M g$$.
> - Karena $$\mu_k < \mu_s$$, balok langsung dipercepat saat mulai bergerak.

{: .try }
> - Naikkan $$m_g$$ 5 g demi 5 g. Kapan balok mulai bergerak? Bandingkan dengan $$\mu_s M$$.
> - Set $$\mu_k$$ lebih besar dari $$\mu_s$$. Mengapa hasilnya tidak masuk akal secara fisis?

{: .assume }
> - Tali tak bermassa dan tak mulur; katrol ideal.
> - Gaya normal $$N = Mg$$ di lintasan datar.
> - Berhenti di penahan setelah 0,60 m.
