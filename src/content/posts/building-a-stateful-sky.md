---
title: Building a Stateful Sky
description: A rendering architecture for persistent interactive worlds.
theme: engineering
published: 2026-09-08
universe:
  offset: [1.8, 0.5, -0.18]
---

The difficult part of an interactive 3D site is not drawing particles. It is preserving continuity while the rest of the website behaves like a normal document.

## One renderer, many pages

The universe canvas is treated as a persistent system. Article routes can change, but the renderer, camera and simulation state remain alive across navigation.

## Transitions are state changes

Cover, collapse, big bang, flight, article entry and reverse entry are explicit states. That keeps visual effects from becoming a pile of timers that cannot be interrupted or reversed.
