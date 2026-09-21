---
layout: default
title: Hukum Kirchhoff Dua Loop
parent: Rangkaian DC
grand_parent: Elektronika
nav_order: 2
---

# Hukum Kirchhoff Dua Loop
Jumlah tegangan mengelilingi tiap loop nol, dan arus yang masuk simpul sama dengan yang keluar.

{% include sim.html id="kirchhoff-dua-loop" %}

$$V_1 = I_1 R_1 + (I_1 + I_2) R_3, \qquad V_2 = I_2 R_2 + (I_1 + I_2) R_3$$

{: .note }
> - $$I_3 = I_1 + I_2$$ di simpul atas: hukum arus Kirchhoff.
> - Kedua persamaan KVL di bawah rangkaian selalu berjumlah nol.
> - Arus negatif berarti arah sebenarnya berlawanan dengan anak panah.

{: .try }
> - Set $$V_2 = 0$$. Ke mana arah $$I_2$$ sekarang?
> - Atur $$V_1$$ dan $$V_2$$ agar $$I_3 = 0$$. Apa hubungannya dengan $$R_1$$ dan $$R_2$$?

{: .assume }
> - Sumber ideal, kawat tanpa hambatan.
> - Keadaan tunak; penggeser bekerja langsung.
> - Arah acuan: $$I_1$$ searah dan $$I_2$$ berlawanan jarum jam.
