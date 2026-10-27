/*
 * Generates the module's icon pack from the glyph library (scripts/iconpack/glyphs.mjs).
 * Runs on Windows, macOS and Linux, no installed app required.
 *
 *   node scripts/build-icons.mjs              generate SVG, render PNG, bundle
 *   node scripts/build-icons.mjs --svg <dir>  only write SVG sources to <dir>
 *   node scripts/build-icons.mjs --bundle     only bundle ./icons/*.png
 *
 * Rendering needs @resvg/resvg-js, which is not a dependency of the module
 * (the rendered graphics are committed). Install it temporarily before rendering:
 *   npm install --no-save @resvg/resvg-js
 *
 * Output:
 *   icons/ctl_<glyph>.png                 control icon as a full button 72 x 72: white glyph
 *                                         28 px at the top, transparent below for the text
 *   icons/tile_<glyph>_<color>_<n>l.png   colored tile 72 x 72 with glyph and a text band for n lines
 *   src/icons.generated.ts                everything bundled as Base64 (used by src/icons.ts)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GLYPHS } from './iconpack/glyphs.mjs'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'icons')
const BUNDLE = path.join(ROOT, 'src', 'icons.generated.ts')

// ---- Design tokens ----------------------------------------------------------
const TILE = 72 // Tile size (Companion button)
const RADIUS = 12 // Corner radius of the tile
const INK_LIGHT = '#FFFFFF'
const INK_DARK = '#111111'
const BAND_ALPHA = 0.45 // Text strip at the bottom
// Control icon on the button. Companion scales images to the full button ("fit"),
// so the icon already sits in its place within a 72 px area.
const BUTTON_GLYPH = 28
const BUTTON_GLYPH_Y = 5
// Text band height and glyph size per number of text lines (14 px font)
const LAYOUT = {
	1: { band: 22, glyph: 32 },
	2: { band: 34, glyph: 28 },
	3: { band: 48, glyph: 20 },
}

// Tile colors: one color -> light/base/dark gradient, two colors -> gradient between them
const COLORS = {
	master: [
		[235, 70, 40],
		[170, 20, 70],
	],
	input: [[30, 110, 230]],
	line: [[0, 160, 170]],
	player: [[130, 70, 200]],
	fx: [[210, 50, 160]],
	sub: [[40, 160, 80]],
	aux: [[240, 130, 20]],
	vca: [[225, 185, 0]],
	mute: [[225, 30, 30]],
	solo: [[255, 225, 0]],
	post: [[0, 130, 40]],
	dim: [[0, 150, 255]],
	playing: [[225, 30, 30]],
	stopped: [[0, 200, 80]],
	paused: [[255, 153, 51]],
	phones: [[90, 120, 160]],
	matrix: [[80, 90, 200]],
	recording: [[225, 30, 30]],
}

// Which tiles the presets use: [glyph, color, lines]
const TILES = [
	...[
		'master',
		'input',
		'line',
		'player',
		'fx',
		'sub',
		'aux',
		'vca',
		'mute',
		'dim',
		'solo',
		'phones',
		'matrix',
	].flatMap((c) => [1, 2, 3].map((n) => ['knob', c, n])),
	['mute', 'mute', 2],
	['solo', 'solo', 2],
	['post', 'post', 2],
	['dim', 'dim', 2],
	['play', 'playing', 2],
	['play', 'stopped', 2],
	['stop', 'playing', 1],
	['pause', 'paused', 1],
	['rec', 'recording', 1],
	['rec', 'recording', 2],
	['rec', 'paused', 2],
	['sound', 'solo', 2],
	['sound', 'phones', 2],
	['fader', 'playing', 2],
	['fader', 'stopped', 2],
	['fader', 'paused', 1],
]

const hex = ([r, g, b]) =>
	'#' + [r, g, b].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')
const mix = ([r, g, b], f) => [r, g, b].map((v) => Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))
const luminance = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b

// Ink based on the brightness of the area behind the glyph
function inkFor(colors) {
	const avg = colors.reduce((s, c) => s + luminance(c), 0) / colors.length
	return avg > 165 ? INK_DARK : INK_LIGHT
}

// Place a glyph from the 24 grid at position/size; white ink gets
// a soft shadow of the same shape so it still reads on light colors.
function placeGlyph(draw, ink, x, y, size) {
	const s = size / 24
	const shadow =
		ink === INK_LIGHT
			? `<g transform="translate(${x} ${y + 1.2}) scale(${s})" opacity="0.28">${draw('#000000')}</g>`
			: ''
	return `${shadow}<g transform="translate(${x} ${y}) scale(${s})">${draw(ink)}</g>`
}

function svgDoc(size, body) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${body}</svg>`
}

// Control icon as a full button 72 x 72, transparent, icon centered at the top
function controlSvg(glyph) {
	const x = (TILE - BUTTON_GLYPH) / 2
	return svgDoc(TILE, placeGlyph(GLYPHS[glyph], INK_LIGHT, x, BUTTON_GLYPH_Y, BUTTON_GLYPH))
}

// Tile: color gradient, glyph centered in the upper field, text strip at the bottom
function tileSvg(glyph, colorKey, lines) {
	const colors = COLORS[colorKey]
	const { band, glyph: glyphSize } = LAYOUT[lines]
	const stops = colors.length === 1 ? [mix(colors[0], 0.3), colors[0], mix(colors[0], -0.3)] : colors
	const stopTags = stops.map((c, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${hex(c)}"/>`).join('')
	const field = TILE - band
	const gy = Math.max(2, (field - glyphSize) / 2)
	const g = placeGlyph(GLYPHS[glyph], inkFor(colors), (TILE - glyphSize) / 2, gy, glyphSize)
	return svgDoc(
		TILE,
		`<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">${stopTags}</linearGradient><clipPath id="r"><rect width="${TILE}" height="${TILE}" rx="${RADIUS}"/></clipPath></defs>` +
			`<g clip-path="url(#r)"><rect width="${TILE}" height="${TILE}" fill="url(#g)"/>${g}` +
			`<rect x="0" y="${field}" width="${TILE}" height="${band}" fill="#000000" fill-opacity="${BAND_ALPHA}"/></g>`,
	)
}

// All graphics of the pack: file name -> SVG
function buildAll() {
	const out = {}
	for (const glyph of Object.keys(GLYPHS)) {
		out[`ctl_${glyph}`] = controlSvg(glyph)
	}
	for (const [glyph, color, lines] of TILES) {
		out[`tile_${glyph}_${color}_${lines}l`] = tileSvg(glyph, color, lines)
	}
	return out
}

function bundle() {
	const data = {}
	const files = fs
		.readdirSync(OUT)
		.filter((f) => f.endsWith('.png'))
		.sort()
	for (const f of files) {
		data[f.replace(/\.png$/, '')] = fs.readFileSync(path.join(OUT, f)).toString('base64')
	}
	const body = Object.entries(data)
		.map(([k, v]) => `\t${k}: '${v}',`)
		.join('\n')
	fs.writeFileSync(
		BUNDLE,
		`// Generated by scripts/build-icons.mjs. Do not edit, run "yarn icons" instead.\n` +
			`export const ICONS: Record<string, string> = {\n${body}\n}\n`,
	)
	console.log(`${Object.keys(data).length} graphics bundled into ${path.relative(ROOT, BUNDLE)}`)
}

async function loadResvg() {
	try {
		// Optional renderer, deliberately not a dependency of the module (see header)
		// eslint-disable-next-line n/no-extraneous-import
		const mod = await import('@resvg/resvg-js')
		return mod.Resvg
	} catch {
		throw new Error('Rendering needs @resvg/resvg-js: npm install --no-save @resvg/resvg-js')
	}
}

async function main() {
	const args = process.argv.slice(2)
	if (args[0] === '--bundle') return bundle()

	const all = buildAll()
	if (args[0] === '--svg') {
		const dir = path.resolve(args[1] || path.join(ROOT, 'icons-svg'))
		fs.mkdirSync(dir, { recursive: true })
		for (const [name, svg] of Object.entries(all)) fs.writeFileSync(path.join(dir, `${name}.svg`), svg)
		console.log(`${Object.keys(all).length} SVG sources in ${dir}`)
		return
	}

	const Resvg = await loadResvg()
	fs.mkdirSync(OUT, { recursive: true })
	for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f))
	for (const [name, svg] of Object.entries(all)) {
		const png = new Resvg(svg, { fitTo: { mode: 'width', value: TILE }, font: { loadSystemFonts: false } })
			.render()
			.asPng()
		fs.writeFileSync(path.join(OUT, `${name}.png`), png)
	}
	console.log(`${Object.keys(all).length} graphics rendered to icons/`)
	bundle()
}

await main()
