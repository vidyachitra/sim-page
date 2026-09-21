---
layout: default
title: Metode Euler dan RK4
parent: Metode Numerik
nav_order: 1
---

# Metode Euler dan RK4
Metode Euler memakai kemiringan di awal langkah saja, sehingga energinya bertambah tiap langkah; RK4 jauh lebih akurat.

{% include sim.html id="euler-rk4" %}

$$y_{n+1} = y_n + \Delta t\, f(t_n, y_n), \qquad \omega = \sqrt{\frac{k}{m}}$$

{: .note }
> - Amplitudo Euler membesar tiap periode; energinya naik terus.
> - RK4 hampir berimpit dengan solusi eksak pada $$\Delta t$$ yang sama.
> - Galat Euler tumbuh seperti $$\Delta t$$; galat RK4 seperti $$\Delta t^4$$.

{: .try }
> - Kecilkan $$\Delta t$$ dua kali. Berapa kali galat Euler mengecil? Galat RK4?
> - Set $$\Delta t = 0{,}25$$ s dan $$k = 50$$ N/m. Berapa periode sampai Euler divergen?

{: .assume }
> - Pegas ideal tanpa gesekan; dilepas dari diam di $$x = A$$.
> - Metode numerik melangkah tiap $$\Delta t$$ waktu simulasi.
> - Euler dihentikan bila $$|x| > 5A$$.
