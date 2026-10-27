**Soundcraft Ui12 / Ui16 / Ui24R**

This module controls the Soundcraft Ui series (Ui12, Ui16 and Ui24R).
Please be aware of your device's capabilities – not all available features are supported on all device versions.
If you're missing a feature, feel free to [open an issue](https://github.com/bitfocus/companion-module-soundcraft-ui/issues).

| Console Function       | What it does                                              |
| ---------------------- | --------------------------------------------------------- |
| Mute                   | Mute channels (incl. feedback)                            |
| Solo                   | Set SOLO for channels on master bus (incl. feedback)      |
| Set Fader Levels       | Set the level of faders (dB or %)                         |
| Change Fader Levels    | Relatively change the level of faders (dB or %)           |
| Fade transitions       | Perform fade transitions on all channels                  |
| Set channel delay      | Set delay for all faders and master                       |
| Set/change PAN         | Set and relatively change PAN                             |
| PRE/POST               | Set PRE/POST for channels on AUX or FX buses              |
| PRE/POST PROC          | Set PRE/POST PROC for channels on AUX buses (Ui24R only)  |
| SOLO/Headphone Volume  | Set and change the volume of SOLO and Headphone buses     |
| MUTE Groups            | Enable, disable and toggle MUTE groups                    |
| Media Player           | Control media player transport, load playlists and tracks |
| 2-Track Recording      | Control the dual-track recorder                           |
| Multitrack Recording   | Control the multitrack recorder (Ui24R only)              |
| Dim Master             | Dim the master bus (incl. feedback) (Ui24R only)          |
| Shows, Snapshots, Cues | Load shows, snapshots and cues. Save snapshots and cues   |
| Gain and Phantom Power | Switch phantom power and adjust gain on hardware channels |
| Automix                | Enable/disable automix groups, assign channels to groups  |
| FX Settings            | Set parameters and BPM for FX processors                  |
| Patching               | Change patch config (Ui24R only)                          |
| Matrix source control  | Control sources routed to a matrix bus (Ui24R only)       |
| Raw messages           | Read and write raw state from the mixer (advanced)        |

## Master fader

The master fader can be set and changed in dB or % (`Master: Set fader value`, `Master: Change fader value`) and faded over time (`Master: Fade transition`).
The current master level is always available as variables, independent of the module config:

| Variable      | Content                                                |
| ------------- | ------------------------------------------------------ |
| `m_level`     | Master fader level in dB (`-100` stands for -inf)      |
| `m_level_pct` | Master fader level in percent of the fader way (0-100) |

To show the volume on a button, use the variables in the button text, e.g. `$(soundcraft-ui:m_level) dB` and `$(soundcraft-ui:m_level_pct) %`.

## Rotary encoders

Faders can be controlled with rotary encoders (Stream Deck +, Loupedeck, ...).
Ready-made presets set up the rotary actions for you – drag them onto an encoder:

| Preset section                    | Rotate                        | Press                      |
| --------------------------------- | ----------------------------- | -------------------------- |
| Master → `Master: Fader (rotary)` | Master level ±1 dB per tick   | Toggle DIM (Ui24R only)    |
| Master Channels: Fader (rotary)   | Channel level ±1 dB per tick  | Toggle MUTE                |
| AUX Bus n → `... Fader (rotary)`  | AUX send level ±1 dB per tick | Toggle MUTE on the AUX bus |

The step size is the value of the `Change fader value (dB)` action in the "Rotate left" / "Rotate right" groups of the button and can be changed there.
Any `Change fader value` action can be used the same way on your own buttons.

The master preset shows the level in dB and %. The channel presets show the channel name and – when the fader level variables are enabled in the module config – the level in dB and %.

## Variables and feedback

This module supports variables and feedback for most functions.
Fader levels, channel names, PAN values and player status are available as variables.
Fader level variables for all channels (dB and %) and PAN variables have to be enabled in the module config.

VU meter levels are available as value feedbacks that can be used to write to local variables.

Boolean feedback is available for MUTE, SOLO, PRE/POST, DIM, player state and more.

## Presets and icons

Presets are available for MUTE and SOLO of all channels on the master bus, MUTE / PRE-POST / fader of all channels on the AUX buses, the rotary faders, the media player and the master (fader, DIM).

All presets come with graphics in one visual language: white line icons on black buttons for controls (MUTE, SOLO, PRE/POST, DIM, transport) and colored tiles for the rotary faders and for active states (MUTE red, SOLO yellow, POST green, DIM blue, player red/green/orange).
The fader tiles are colored by channel type: input blue, line teal, player purple, FX magenta, subgroup green, AUX orange, VCA yellow, master red.
The presets disable the button top bar so that the text fits below the icon.
