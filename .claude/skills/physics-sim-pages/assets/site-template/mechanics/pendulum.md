---
layout: default
title: Simple Pendulum
parent: Mechanics
nav_order: 1
---

# Simple Pendulum
A swinging mass trades kinetic and potential energy while total energy stays constant.

{% include sim.html id="pendulum" %}

$$\ddot{\theta} = -\frac{g}{L}\sin\theta - b\,\dot{\theta}$$

{: .note }
> - KE peaks at the bottom, PE at the ends.
> - With $$b = 0$$, the E line stays flat.
> - Large angles swing slower than small ones.

{: .try }
> - Set $$b$$ above zero. Where does the energy go?
> - Double $$L$$. Does the period double?

{: .assume }
> - Point mass on a massless rigid rod.
> - No small-angle approximation.
> - Damping proportional to angular velocity.
