---
layout: default
title: Arus Induktor RL
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 2
---

# Arus Induktor RL
Arus induktor tidak dapat melompat; ia naik eksponensial dengan $$\tau = L/R$$ sementara tegangan induktor yang melompat.

{% include sim.html id="rl-transien" %}

$$i(t) = \frac{V}{R}\left(1 - e^{-tR/L}\right), \qquad v_L = L\frac{di}{dt}$$

{: .note }
> - Saat saklar ditutup, $$v_L$$ langsung $$V$$ dan $$i$$ masih nol.
> - $$i$$ mendekati $$V/R$$; $$v_L$$ meluruh ke nol.
> - Saat dilepas, $$i$$ berlanjut dan $$v_L$$ berbalik tanda.

{: .try }
> - Gandakan $$L$$. Apakah $$\tau$$ ikut berlipat dua? Bagaimana dengan $$V/R$$?
> - Bandingkan grafik $$v_L$$ ini dengan $$i$$ pada rangkaian RC. Mengapa serupa?

{: .assume }
> - Induktor ideal tanpa hambatan belitan.
> - Saklar dua posisi: melepas berarti RL dihubung singkat, bukan diputus.
> - Tampilan diperlambat 1000 kali; $$\tau$$ dalam ms.
