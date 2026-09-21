---
layout: default
title: Pengisian Kapasitor RC
parent: Rangkaian Transien
grand_parent: Elektronika
nav_order: 1
---

# Pengisian Kapasitor RC
Tegangan kapasitor mendekati sumber secara eksponensial dengan konstanta waktu $$\tau = RC$$; arusnya meluruh dengan laju yang sama.

{% include sim.html id="rc-transien" %}

$$v_C(t) = V\left(1 - e^{-t/RC}\right), \qquad i(t) = \frac{V}{R}\,e^{-t/RC}$$

{: .note }
> - Pada $$t = \tau$$, $$v_C$$ tepat 63 % dari $$V$$; pada $$5\tau$$ hampir penuh.
> - Arus terbesar tepat saat saklar ditutup, lalu meluruh.
> - Saat pengosongan, $$v_C$$ dan $$i$$ meluruh dengan $$\tau$$ yang sama.

{: .try }
> - Gandakan $$R$$ lalu gandakan $$C$$. Mana yang mengubah $$\tau$$? Keduanya?
> - Pindahkan saklar ke 0 saat $$v_C$$ baru setengah. Bagaimana bentuk kurva pengosongan?

{: .assume }
> - Nilai komponen nyata: $$\tau$$ dalam ms; tampilan diperlambat 1000 kali.
> - Sumber dan kapasitor ideal, kawat tanpa hambatan.
> - Saklar berpindah seketika tanpa pantulan.
