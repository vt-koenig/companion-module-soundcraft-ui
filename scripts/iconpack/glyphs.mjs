/*
 * Soundcraft Ui icon pack: all glyphs in one visual language.
 *
 * Rules (apply to every glyph):
 *   - Grid 24 x 24, motif in the field 2..22 (2 units margin)
 *   - Line 2 units, round ends and corners (stroke-linecap/-linejoin round)
 *   - Fills only single-color in the same ink as the line, no gradients
 *   - One ink per glyph (white on dark tiles, near black on light tiles)
 *   - Corners on rectangles rx 1-2, circles and arcs instead of freehand
 *
 * Each glyph is a function (ink) => SVG fragment in the 24 grid.
 */

export const STROKE = 2 // Stroke width in the 24 grid

const line = (d, ink) =>
	`<path d="${d}" fill="none" stroke="${ink}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`
const circle = (cx, cy, r, ink) =>
	`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ink}" stroke-width="${STROKE}"/>`
const dot = (cx, cy, r, ink) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${ink}"/>`
const rect = (x, y, w, h, rx, ink) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${ink}" stroke-width="${STROKE}" stroke-linejoin="round"/>`
const box = (x, y, w, h, rx, ink) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${ink}"/>`

// Speaker body (shared by sound / mute)
const speaker = (ink) => line('M3.5 9.5h3l5-4v13l-5-4h-3Z', ink)

// Three vertical faders with caps (same motif as the dimmer icon in the Ui app)
const faders = (k) =>
	line('M6 3.5v17M12 3.5v17M18 3.5v17', k) +
	box(3.5, 13, 5, 3, 1.2, k) +
	box(9.5, 6, 5, 3, 1.2, k) +
	box(15.5, 10, 5, 3, 1.2, k)

export const GLYPHS = {
	/** Three faders: level buttons */
	fader: faders,

	/** Rotary knob with indicator and tick marks: rotary fader buttons */
	knob: (k) =>
		circle(12, 13, 7, k) +
		line('M12 13 7.8 8.8', k) +
		dot(12, 13, 1.4, k) +
		line('M3.5 17.5 5.2 16.6M20.5 17.5l-1.7-.9M12 2.8v1.9', k),

	/** Speaker with sound waves: master */
	sound: (k) => speaker(k) + line('M15 9.2a4 4 0 0 1 0 5.6M17.8 6.5a8 8 0 0 1 0 11', k),

	/** Speaker with cross: MUTE */
	mute: (k) => speaker(k) + line('M15.5 9.5 20.5 14.5M20.5 9.5l-5 5', k),

	/** Headphones: SOLO */
	solo: (k) =>
		line('M4 16.5V12a8 8 0 0 1 16 0v4.5', k) + box(2.5, 13.5, 4.5, 7, 1.5, k) + box(17, 13.5, 4.5, 7, 1.5, k),

	/** Toggle switch, handle left: PRE */
	pre: (k) => rect(2.5, 7.5, 19, 9, 4.5, k) + dot(7, 12, 2.5, k),

	/** Toggle switch, handle right: POST */
	post: (k) => rect(2.5, 7.5, 19, 9, 4.5, k) + dot(17, 12, 2.5, k),

	/** Moon: DIM */
	dim: (k) => line('M19.5 14.2A8 8 0 1 1 9.8 4.5a6.4 6.4 0 0 0 9.7 9.7Z', k),

	/** Media player transport */
	play: (k) => line('M8 5.2v13.6L19 12Z', k),
	stop: (k) => rect(5.5, 5.5, 13, 13, 2, k),
	pause: (k) => box(6, 5, 4, 14, 1.2, k) + box(14, 5, 4, 14, 1.2, k),
	prev: (k) => line('M18 5.5v13L8.5 12Z', k) + line('M5.5 5.5v13', k),
	next: (k) => line('M6 5.5v13L15.5 12Z', k) + line('M18.5 5.5v13', k),

	/** Clock: elapsed / remaining time */
	clock: (k) => circle(12, 12, 9, k) + line('M12 7v5l3.5 2', k),

	/** Record dot */
	rec: (k) => circle(12, 12, 9, k) + dot(12, 12, 4, k),
}
