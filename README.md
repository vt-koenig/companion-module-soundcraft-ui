# companion-module-soundcraft-ui

[Bitfocus Companion](https://bitfocus.io/companion) module for the Soundcraft Ui12, Ui16 and Ui24R mixing consoles.
The module talks to the mixer over WebSocket using the [soundcraft-ui-connection](https://github.com/fmalcher/soundcraft-ui) library.

The user documentation shown inside Companion lives in [companion/HELP.md](companion/HELP.md): supported console functions, variables, rotary encoder presets and the icon pack.
Example button pages for every feature area are in [examples/](examples/).

## Getting started

Execute `yarn` command to install the dependencies.
The module can be built once with `yarn build`. This should be enough to get the module to be loadable by companion.
While developing the module, by using `yarn dev` the compiler will be run in watch mode to recompile the files on change.

```bash
yarn            # install dependencies
yarn dev        # build in watch mode
yarn build      # clean build to dist/
yarn lint       # run ESLint
yarn dist       # build the distribution package (pkg/ and soundcraft-ui-<version>.tgz)
yarn icons      # regenerate the icon pack (see below)
```

To try the module in Companion without a release, point the _Developer modules path_ in the Companion settings to a folder that contains the built `pkg/soundcraft-ui` directory.

## Master fader and level display

The master fader can be controlled with the `Master: Set/Change fader value` actions (in dB or %) and the `Master: Fade transition` action.
The current master level is always available in the variables `m_level` (dB, `-100` means `-inf`) and `m_level_pct` (%).
Use them in a button text to show the volume on the display, e.g.

```
MASTER
$(soundcraft-ui:m_level) dB
$(soundcraft-ui:m_level_pct) %
```

The presets use Companion text expressions instead, so a fader that is fully down reads `-inf` rather than `-100`:

```
'MASTER\n' + ($(soundcraft-ui:m_level) <= -100 ? '-inf' : $(soundcraft-ui:m_level)) + ' dB\n' + $(soundcraft-ui:m_level_pct) + ' %'
```

The numeric variables are unchanged. The SOLO bus and headphone levels are always available as `vol_solo_level`, `vol_hp1_level`, `vol_hp2_level` (dB) and their `_pct` counterparts.
Level variables for all other channels (`m_input1_level`, `aux1_input1_level_pct`, ...) must be enabled in the connection settings.

## Rotary encoders (Stream Deck +, Loupedeck, ...)

The module ships presets for controlling faders with rotary encoders. Drag them onto an encoder button and the rotary actions are set up automatically:

| Preset section                    | Rotate                            | Press                      |
| --------------------------------- | --------------------------------- | -------------------------- |
| Master → `Master: Fader (rotary)` | Master level, one step per tick   | Toggle DIM (Ui24R only)    |
| Master Channels: Fader (rotary)   | Channel level, one step per tick  | Toggle MUTE                |
| AUX Bus n → `... Fader (rotary)`  | AUX send level, one step per tick | Toggle MUTE on the AUX bus |
| FX Bus n → `... Fader (rotary)`   | FX send level, one step per tick  | Toggle MUTE on the FX bus  |
| SOLO / Headphone Volume           | SOLO or headphone volume per tick | –                          |

The step size is the connection setting **Rotary encoder step (dB)** (default 1 dB). It is applied when a preset is dragged onto a button; existing buttons keep their value, which lives in the `Change fader value (dB)` actions of the button.
The channel presets show the channel name and, when the fader level variables are enabled in the connection settings, the current level in dB and %.
For custom buttons, use any `Change fader value` action in the "Rotate left" / "Rotate right" action groups of a button.

## Presets

| Section                         | Buttons                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------- |
| Master Channels: MUTE           | MUTE toggle with feedback for every channel on the master bus                            |
| Master Channels: SOLO           | SOLO toggle with feedback for every channel on the master bus                            |
| Master Channels: Fader (rotary) | Rotary fader per channel, press = MUTE                                                   |
| AUX Bus 1..n                    | MUTE, PRE/POST and rotary send fader for every channel on the bus                        |
| FX Bus 1..n                     | MUTE, PRE/POST and rotary send fader for every channel on the bus                        |
| SOLO / Headphone Volume         | Rotary faders for the SOLO bus and headphone 1/2 with dB/% display                       |
| MUTE Groups                     | MUTE group 1-6, MUTE ALL and MUTE FX toggles with feedback                               |
| Media Player                    | Elapsed/remaining time, previous, next, play/stop, stop, pause                           |
| 2-Track Recorder                | Record toggle with feedback                                                              |
| Multitrack Recorder             | Play/stop, stop, pause, record toggle, soundcheck toggle, elapsed/remaining (Ui24R only) |
| Master                          | Rotary master fader with dB/% display, DIM (Ui24R only)                                  |

## Icon pack

All presets come with graphics in one visual language: white line icons on black buttons for controls (MUTE, SOLO, PRE/POST, transport, record) and colored tiles for faders and active states (red = MUTE and recording, yellow = SOLO, green = POST, blue = DIM). The fader tiles are colored by channel type (input blue, line teal, player purple, FX magenta, subgroup green, AUX orange, VCA yellow, master red).

The presets use the graphics as full-button image with the text at the bottom and the top bar disabled, so the text does not overlap the icon.

The graphics live in `icons/` as PNG (72 × 72) and are bundled into `src/icons.generated.ts`, so no files have to be shipped next to the module. To change them, edit the glyphs in `scripts/iconpack/glyphs.mjs` or the colors and tile list in `scripts/build-icons.mjs` and run:

```bash
npm install --no-save @resvg/resvg-js
yarn icons
```

`yarn icons --svg <dir>` writes the SVG sources instead, for editing in a vector tool. `yarn icons --bundle` only rebuilds `src/icons.generated.ts` from the PNG files in `icons/`.

Glyph rules: 24 × 24 grid with a 2 unit margin, 2 unit stroke with round caps and joins, one ink per glyph. Tiles pick white or near-black ink automatically from the tile color.
