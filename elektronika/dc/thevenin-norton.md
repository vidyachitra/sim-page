---
layout: default
title: Teorema Thevenin dan Norton
parent: Rangkaian DC
grand_parent: Elektronika
nav_order: 3
---

# Teorema Thevenin dan Norton
Dilihat dari terminal beban, jaringan apa pun setara dengan satu sumber tegangan seri resistor, atau satu sumber arus paralel resistor.

{% include sim.html id="thevenin-norton" %}

$$V_{th} = V_s\frac{R_2}{R_1+R_2}, \qquad R_{th} = R_1 \parallel R_2, \qquad I_N = \frac{V_{th}}{R_{th}}$$

{: .note }
> - Ketiga rangkaian memberi $$V_L$$ dan $$I_L$$ yang persis sama.
> - $$V_L$$ mendekati $$V_{th}$$ saat $$R_L$$ besar; $$I_L$$ mendekati $$I_N$$ saat $$R_L$$ kecil.
> - Daya beban maksimum tepat di $$R_L = R_{th}$$.

{: .try }
> - Geser $$R_L$$ ke $$R_{th}$$. Apakah titik pada sisipan berada di puncak?
> - Set $$R_1 = R_2$$. Berapa $$V_{th}$$ dibanding $$V_s$$?

{: .assume }
> - Sumber ideal, keadaan tunak.
> - $$R_N = R_{th}$$; kedua setara dihitung dari rangkaian asli.
> - Sisipan: $$P_L$$ terhadap $$R_L$$ pada 0–1000 Ω.
