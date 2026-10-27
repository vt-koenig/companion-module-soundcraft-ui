# companion-module-soundcraft-ui

## Getting started

Execute `yarn` command to install the dependencies.
The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.
While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

## Master fader and level display

The master fader can be controlled with the `Master: Set/Change fader value` actions (in dB or %) and the `Master: Fade transition` action.
The current master level is always available in the variables `m_level` (dB, `-100` means `-inf`) and `m_level_pct` (%).
Use them in a button text to show the volume on the display, e.g.

```
MASTER
$(soundcraft-ui:m_level) dB
$(soundcraft-ui:m_level_pct) %
```

Level variables for all other channels (`m_input1_level`, `aux1_input1_level_pct`, ...) must be enabled in the connection settings.

## Rotary encoders (Stream Deck +, Loupedeck, ...)

The module ships presets for controlling faders with rotary encoders. Drag them onto an encoder button and the rotary actions are set up automatically:

| Preset section                    | Rotate                        | Press                      |
| --------------------------------- | ----------------------------- | -------------------------- |
| Master → `Master: Fader (rotary)` | Master level ±1 dB per tick   | Toggle DIM (Ui24R only)    |
| Master Channels: Fader (rotary)   | Channel level ±1 dB per tick  | Toggle MUTE                |
| AUX Bus n → `... Fader (rotary)`  | AUX send level ±1 dB per tick | Toggle MUTE on the AUX bus |

The step size can be changed in the `Change fader value (dB)` actions of the button.
The channel presets show the channel name and, when the fader level variables are enabled in the connection settings, the current level in dB and %.
For custom buttons, use any `Change fader value` action in the "Rotate left" / "Rotate right" action groups of a button.

## Icon pack

All presets come with graphics in one visual language: white line icons on black buttons for controls (MUTE, SOLO, PRE/POST, transport) and colored tiles for faders and active states (red = MUTE, yellow = SOLO, green = POST, blue = DIM). The fader tiles are colored by channel type (input blue, line teal, player purple, FX magenta, subgroup green, AUX orange, VCA yellow, master red).

The graphics live in `icons/` as PNG (72 × 72) and are bundled into `src/icons.generated.ts`, so no files have to be shipped next to the module. To change them, edit the glyphs in `scripts/iconpack/glyphs.mjs` or the colors in `scripts/build-icons.mjs` and run:

```bash
npm install --no-save @resvg/resvg-js
yarn icons
```

`yarn icons --svg <dir>` writes the SVG sources instead, for editing in a vector tool.
