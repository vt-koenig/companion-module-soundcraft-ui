import { ICONS } from './icons.generated.js'

/**
 * Graphics for the presets from the icon pack (scripts/build-icons.mjs).
 * All graphics are bundled as Base64 PNG in src/icons.generated.ts,
 * so they are included in the built Companion package.
 */

export type TileColor =
	| 'master'
	| 'input'
	| 'line'
	| 'player'
	| 'fx'
	| 'sub'
	| 'aux'
	| 'vca'
	| 'mute'
	| 'solo'
	| 'post'
	| 'dim'
	| 'playing'
	| 'stopped'
	| 'paused'

export type Glyph =
	| 'fader'
	| 'knob'
	| 'sound'
	| 'mute'
	| 'solo'
	| 'pre'
	| 'post'
	| 'dim'
	| 'play'
	| 'stop'
	| 'pause'
	| 'prev'
	| 'next'
	| 'clock'
	| 'rec'

/**
 * Control icon as Base64 PNG (for style.png64): white glyph at the top of a
 * transparent 72 x 72 button, the lower part stays free for the button text.
 */
export function controlIcon(glyph: Glyph): string | undefined {
	return ICONS[`ctl_${glyph}`]
}

/**
 * Colored 72 x 72 tile with glyph and a text band at the bottom (for style.png64).
 * @param glyph glyph shown in the upper field of the tile
 * @param color tile color (channel type or state)
 * @param lines number of text lines (1..3) the band must hold
 */
export function tile(glyph: Glyph, color: TileColor, lines: 1 | 2 | 3): string | undefined {
	return ICONS[`tile_${glyph}_${color}_${lines}l`]
}
