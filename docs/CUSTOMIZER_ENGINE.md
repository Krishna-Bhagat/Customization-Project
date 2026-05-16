# Customization Engine (Fabric.js) Documentation

## Main File

- `frontend/src/components/FabricDesigner.jsx`

## Core Concepts

- One Fabric canvas instance per enabled side (`front`, `back`, `left-sleeve`, etc.)
- Side canvases persist independently in memory and session draft
- Active side is switched visually without losing object state

## Printable Area System

- Source:
  - backend `product_sides.printable_area_*`
  - frontend fallback presets in `constants/customizer.js`
- Enforcement:
  - canvas clipPath
  - object move/scale/rotate boundary clamp
  - center snap guide visualization

## Design Object Features

- Text:
  - added as editable `fabric.IText`
  - draggable, scalable, rotatable
  - custom font, color, size
- Image:
  - uploaded from local file
  - auto-fit to printable area
  - draggable, scalable, rotatable

## State and History

- Side canvas history stack supports undo/redo.
- Snapshot strategy uses `canvas.toDatalessJSON()`.
- Persisted in session storage through workspace page integration.

## Export Behavior

- Transparent design export per side:
  - crop to printable area
  - PNG output
- Checkout page composes downloadable mockup previews using:
  - side mockup image
  - exported design overlay

## Files To Edit For Customizer Changes

- Canvas behavior/controls: `components/FabricDesigner.jsx`
- Side normalization and labels: `utils/productSides.js`
- Printable presets: `constants/customizer.js`
- Draft persistence and lifecycle: `utils/customizationSession.js`
- Download composition: `utils/designDownload.js`

