import {
	combineRgb,
	type CompanionButtonStyleProps,
	type CompanionFeedbackButtonStyleResult,
	type CompanionPresetDefinitions,
	type CompanionPresetDefinition,
	type CompanionPresetSection,
} from '@companion-module/base'
import { PlayerState, type SoundcraftUI } from 'soundcraft-ui-connection'
import { feedbackDefaultStyles } from './feedback.js'
import { firstValueFrom } from 'rxjs'
import type { UiSchema } from './schema.js'
import type { UiConfig } from './config.js'
import { controlIcon, tile, type Glyph, type TileColor } from './icons.js'

/** Fader step size in dB for one tick of a rotary encoder */
const ROTARY_STEP_DB = 1

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

/** Tile color for a channel type on the master bus */
const CHANNEL_TYPE_COLORS: Record<string, TileColor> = {
	i: 'input',
	l: 'line',
	p: 'player',
	f: 'fx',
	s: 'sub',
	a: 'aux',
	v: 'vca',
}

type TextSize = '14' | '18' | '24'
type TextLines = 1 | 2 | 3

/**
 * Button style of the icon pack: graphic as full-button image, text at the bottom.
 * Companion draws the text over the image, so the graphics keep the lower part free
 * (control icons) or dim it with a band (tiles). The top bar is disabled because it
 * would shrink the image and shift the text into the glyph.
 */
function iconStyle(text: string, size: TextSize, png64: string | undefined): CompanionButtonStyleProps {
	return {
		text,
		size,
		color: WHITE,
		bgcolor: BLACK,
		png64,
		pngalignment: 'center:center',
		alignment: 'center:bottom',
		show_topbar: false,
	}
}

/** Black button with a white control icon at the top */
function controlStyle(glyph: Glyph, text: string, size: TextSize = '14'): CompanionButtonStyleProps {
	return iconStyle(text, size, controlIcon(glyph))
}

/** Colored tile with glyph and a text band for the given number of lines */
function tileStyle(glyph: Glyph, color: TileColor, lines: TextLines, text: string): CompanionButtonStyleProps {
	return iconStyle(text, '14', tile(glyph, color, lines))
}

/** Feedback style: keep the default colors (fallback without image) and add the matching tile */
function tileFeedbackStyle(
	base: CompanionFeedbackButtonStyleResult,
	glyph: Glyph,
	color: TileColor,
	lines: TextLines,
): CompanionFeedbackButtonStyleResult {
	return { ...base, png64: tile(glyph, color, lines) }
}

/**
 * Build the level lines for a fader button text.
 * The channel level variables only exist when enabled in the config,
 * so the lines are only added when the respective variables are available.
 */
function faderLevelLines(variablePart: string, config: UiConfig): string[] {
	const lines: string[] = []
	if (config.enableFaderLevelVars) {
		lines.push(`$(module:${variablePart}_level) dB`)
	}
	if (config.enableFaderLevelVarsPct) {
		lines.push(`$(module:${variablePart}_level_pct) %`)
	}
	return lines
}

/** Join text lines for a button text (Companion interprets the literal \n) */
function joinLines(lines: string[]): string {
	return lines.join('\\n')
}

function lineCount(lines: string[]): TextLines {
	return Math.min(Math.max(lines.length, 1), 3) as TextLines
}

/**
 * Master fader as a rotary button:
 * rotate to change the level in dB steps, press to toggle DIM (Ui24R only).
 * The button text shows the current level in dB and percent.
 */
function makeMasterFaderButton(masterDim: boolean): CompanionPresetDefinition<UiSchema> {
	const text = joinLines(['MASTER', '$(module:m_level) dB', '$(module:m_level_pct) %'])
	return {
		type: 'simple',
		name: 'Master: Fader (rotary)',
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level'],
		style: tileStyle('knob', 'master', 3, text),
		steps: [
			{
				down: masterDim ? [{ actionId: 'dimmaster', options: { dim: 2 } }] : [],
				up: [],
				rotate_left: [{ actionId: 'changemastervalue', options: { value: -ROTARY_STEP_DB } }],
				rotate_right: [{ actionId: 'changemastervalue', options: { value: ROTARY_STEP_DB } }],
			},
		],
		feedbacks: masterDim
			? [
					{
						feedbackId: 'dimmaster',
						options: {},
						style: tileFeedbackStyle(feedbackDefaultStyles.dim, 'knob', 'dim', 3),
					},
				]
			: [],
	}
}

/**
 * Channel fader on the master bus as a rotary button:
 * rotate to change the level in dB steps, press to toggle MUTE.
 */
function makeMasterChannelFaderButton(
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
	config: UiConfig,
): CompanionPresetDefinition<UiSchema> {
	const lines = [`$(module:m_${variablePart}_name)`, ...faderLevelLines(`m_${variablePart}`, config)]
	const n = lineCount(lines)
	return {
		type: 'simple',
		name: `Master Bus: ${namePart} Fader (rotary)`,
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level'],
		style: tileStyle('knob', CHANNEL_TYPE_COLORS[channelType] ?? 'input', n, joinLines(lines)),
		steps: [
			{
				down: [{ actionId: 'mutemasterchannel', options: { channelType, channel, mute: 2 } }],
				up: [],
				rotate_left: [
					{ actionId: 'changemasterchannelvalue', options: { channelType, channel, value: -ROTARY_STEP_DB } },
				],
				rotate_right: [
					{ actionId: 'changemasterchannelvalue', options: { channelType, channel, value: ROTARY_STEP_DB } },
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mutemasterchannel',
				options: { channelType, channel },
				style: tileFeedbackStyle(feedbackDefaultStyles.mute, 'knob', 'mute', n),
			},
		],
	}
}

/**
 * Channel send on an AUX bus as a rotary button:
 * rotate to change the send level in dB steps, press to toggle MUTE on the AUX bus.
 */
function makeAuxChannelFaderButton(
	bus: number,
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
	config: UiConfig,
): CompanionPresetDefinition<UiSchema> {
	const lines = [`AUX ${bus} $(module:m_${variablePart}_name)`, ...faderLevelLines(`aux${bus}_${variablePart}`, config)]
	const n = lineCount(lines)
	return {
		type: 'simple',
		name: `AUX Bus ${bus}: ${namePart} Fader (rotary)`,
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level', 'send'],
		style: tileStyle('knob', 'aux', n, joinLines(lines)),
		steps: [
			{
				down: [{ actionId: 'muteauxchannel', options: { bus, channelType, channel, mute: 2 } }],
				up: [],
				rotate_left: [
					{ actionId: 'changeauxchannelvalue', options: { bus, channelType, channel, value: -ROTARY_STEP_DB } },
				],
				rotate_right: [
					{ actionId: 'changeauxchannelvalue', options: { bus, channelType, channel, value: ROTARY_STEP_DB } },
				],
			},
		],
		feedbacks: [
			{
				feedbackId: 'muteauxchannel',
				options: { bus, channelType, channel },
				style: tileFeedbackStyle(feedbackDefaultStyles.mute, 'knob', 'mute', n),
			},
		],
	}
}

function makeMasterChannelMuteButton(
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
): CompanionPresetDefinition<UiSchema> {
	return {
		type: 'simple',
		name: `Master Bus: ${namePart} MUTE`,
		style: controlStyle('mute', `MUTE\\n$(module:m_${variablePart}_name)`),
		steps: [
			{
				down: [{ actionId: 'mutemasterchannel', options: { channelType, channel, mute: 2 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mutemasterchannel',
				options: { channelType, channel },
				style: tileFeedbackStyle(feedbackDefaultStyles.mute, 'mute', 'mute', 2),
			},
		],
	}
}

function makeMasterChannelSoloButton(
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
): CompanionPresetDefinition<UiSchema> {
	return {
		type: 'simple',
		name: `Master Bus: ${namePart} SOLO`,
		style: controlStyle('solo', `SOLO\\n$(module:m_${variablePart}_name)`),
		steps: [
			{
				down: [{ actionId: 'solomasterchannel', options: { channelType, channel, solo: 2 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'solomasterchannel',
				options: { channelType, channel },
				style: tileFeedbackStyle(feedbackDefaultStyles.solo, 'solo', 'solo', 2),
			},
		],
	}
}

function makeAuxChannelMuteButton(
	bus: number,
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
): CompanionPresetDefinition<UiSchema> {
	return {
		type: 'simple',
		name: `AUX Bus ${bus}: ${namePart} MUTE`,
		style: controlStyle('mute', `AUX ${bus} MUTE\\n$(module:m_${variablePart}_name)`),
		steps: [
			{
				down: [{ actionId: 'muteauxchannel', options: { bus, channelType, channel, mute: 2 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'muteauxchannel',
				options: { bus, channelType, channel },
				style: tileFeedbackStyle(feedbackDefaultStyles.mute, 'mute', 'mute', 2),
			},
		],
	}
}

function makeAuxChannelPrePostButton(
	bus: number,
	channelType: string,
	channel: number,
	variablePart: string,
	namePart: string,
): CompanionPresetDefinition<UiSchema> {
	return {
		type: 'simple',
		name: `AUX Bus ${bus}: ${namePart} PRE/POST`,
		style: controlStyle('pre', `AUX ${bus} PRE\\n$(module:m_${variablePart}_name)`),
		steps: [
			{
				down: [{ actionId: 'setauxchannelpost', options: { bus, channelType, channel, post: 2 } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'postauxchannel',
				options: { bus, channelType, channel },
				style: {
					...tileFeedbackStyle(feedbackDefaultStyles.post, 'post', 'post', 2),
					text: `AUX ${bus} POST\\n$(module:m_${variablePart}_name)`,
				},
			},
		],
	}
}

export async function createPresets(
	conn: SoundcraftUI,
	config: UiConfig,
): Promise<[CompanionPresetSection<UiSchema>[], CompanionPresetDefinitions<UiSchema>]> {
	const presets: CompanionPresetDefinitions<UiSchema> = {}
	const sections: CompanionPresetSection<UiSchema>[] = []

	const capabilities = await firstValueFrom(conn.deviceInfo.capabilities$)

	/****** Master Channels: MUTE ******/
	const masterMuteIds: string[] = []
	for (let i = 1; i <= capabilities.input; i++) {
		const id = `m_input${i}_mute`
		presets[id] = makeMasterChannelMuteButton('i', i, `input${i}`, `Input ${i}`)
		masterMuteIds.push(id)
	}
	for (let i = 1; i <= capabilities.line; i++) {
		const id = `m_line${i}_mute`
		presets[id] = makeMasterChannelMuteButton('l', i, `line${i}`, `Line ${i}`)
		masterMuteIds.push(id)
	}
	for (let i = 1; i <= capabilities.player; i++) {
		const id = `m_player${i}_mute`
		presets[id] = makeMasterChannelMuteButton('p', i, `player${i}`, `Player ${i}`)
		masterMuteIds.push(id)
	}
	for (let i = 1; i <= capabilities.fx; i++) {
		const id = `m_fx${i}_mute`
		presets[id] = makeMasterChannelMuteButton('f', i, `fx${i}`, `FX ${i}`)
		masterMuteIds.push(id)
	}
	for (let i = 1; i <= capabilities.sub; i++) {
		const id = `m_sub${i}_mute`
		presets[id] = makeMasterChannelMuteButton('s', i, `sub${i}`, `Subgroup ${i}`)
		masterMuteIds.push(id)
	}
	for (let ai = 1; ai <= capabilities.aux; ai++) {
		const id = `m_aux${ai}_mute`
		presets[id] = makeMasterChannelMuteButton('a', ai, `aux${ai}`, `AUX ${ai}`)
		masterMuteIds.push(id)
	}
	for (let i = 1; i <= capabilities.vca; i++) {
		const id = `m_vca${i}_mute`
		presets[id] = makeMasterChannelMuteButton('v', i, `vca${i}`, `VCA ${i}`)
		masterMuteIds.push(id)
	}
	sections.push({ id: 'master-mute', name: 'Master Channels: MUTE', definitions: masterMuteIds })

	/****** Master Channels: SOLO ******/
	const masterSoloIds: string[] = []
	for (let i = 1; i <= capabilities.input; i++) {
		const id = `m_input${i}_solo`
		presets[id] = makeMasterChannelSoloButton('i', i, `input${i}`, `Input ${i}`)
		masterSoloIds.push(id)
	}
	for (let i = 1; i <= capabilities.line; i++) {
		const id = `m_line${i}_solo`
		presets[id] = makeMasterChannelSoloButton('l', i, `line${i}`, `Line ${i}`)
		masterSoloIds.push(id)
	}
	for (let i = 1; i <= capabilities.player; i++) {
		const id = `m_player${i}_solo`
		presets[id] = makeMasterChannelSoloButton('p', i, `player${i}`, `Player ${i}`)
		masterSoloIds.push(id)
	}
	for (let i = 1; i <= capabilities.fx; i++) {
		const id = `m_fx${i}_solo`
		presets[id] = makeMasterChannelSoloButton('f', i, `fx${i}`, `FX ${i}`)
		masterSoloIds.push(id)
	}
	for (let i = 1; i <= capabilities.sub; i++) {
		const id = `m_sub${i}_solo`
		presets[id] = makeMasterChannelSoloButton('s', i, `sub${i}`, `Subgroup ${i}`)
		masterSoloIds.push(id)
	}
	for (let ai = 1; ai <= capabilities.aux; ai++) {
		const id = `m_aux${ai}_solo`
		presets[id] = makeMasterChannelSoloButton('a', ai, `aux${ai}`, `AUX ${ai}`)
		masterSoloIds.push(id)
	}
	for (let i = 1; i <= capabilities.vca; i++) {
		const id = `m_vca${i}_solo`
		presets[id] = makeMasterChannelSoloButton('v', i, `vca${i}`, `VCA ${i}`)
		masterSoloIds.push(id)
	}
	sections.push({ id: 'master-solo', name: 'Master Channels: SOLO', definitions: masterSoloIds })

	/****** Master Channels: Fader (rotary) ******/
	const masterFaderIds: string[] = []
	for (let i = 1; i <= capabilities.input; i++) {
		const id = `m_input${i}_fader`
		presets[id] = makeMasterChannelFaderButton('i', i, `input${i}`, `Input ${i}`, config)
		masterFaderIds.push(id)
	}
	for (let i = 1; i <= capabilities.line; i++) {
		const id = `m_line${i}_fader`
		presets[id] = makeMasterChannelFaderButton('l', i, `line${i}`, `Line ${i}`, config)
		masterFaderIds.push(id)
	}
	for (let i = 1; i <= capabilities.player; i++) {
		const id = `m_player${i}_fader`
		presets[id] = makeMasterChannelFaderButton('p', i, `player${i}`, `Player ${i}`, config)
		masterFaderIds.push(id)
	}
	for (let i = 1; i <= capabilities.fx; i++) {
		const id = `m_fx${i}_fader`
		presets[id] = makeMasterChannelFaderButton('f', i, `fx${i}`, `FX ${i}`, config)
		masterFaderIds.push(id)
	}
	for (let i = 1; i <= capabilities.sub; i++) {
		const id = `m_sub${i}_fader`
		presets[id] = makeMasterChannelFaderButton('s', i, `sub${i}`, `Subgroup ${i}`, config)
		masterFaderIds.push(id)
	}
	for (let ai = 1; ai <= capabilities.aux; ai++) {
		const id = `m_aux${ai}_fader`
		presets[id] = makeMasterChannelFaderButton('a', ai, `aux${ai}`, `AUX ${ai}`, config)
		masterFaderIds.push(id)
	}
	for (let i = 1; i <= capabilities.vca; i++) {
		const id = `m_vca${i}_fader`
		presets[id] = makeMasterChannelFaderButton('v', i, `vca${i}`, `VCA ${i}`, config)
		masterFaderIds.push(id)
	}
	sections.push({ id: 'master-fader', name: 'Master Channels: Fader (rotary)', definitions: masterFaderIds })

	/****** AUX Buses ******/
	for (let ai = 1; ai <= capabilities.aux; ai++) {
		const auxIds: string[] = []
		for (let i = 1; i <= capabilities.input; i++) {
			const muteId = `aux${ai}_input${i}_mute`
			const prepostId = `aux${ai}_input${i}_prepost`
			const faderId = `aux${ai}_input${i}_fader`
			presets[muteId] = makeAuxChannelMuteButton(ai, 'i', i, `input${i}`, `Input ${i}`)
			presets[prepostId] = makeAuxChannelPrePostButton(ai, 'i', i, `input${i}`, `Input ${i}`)
			presets[faderId] = makeAuxChannelFaderButton(ai, 'i', i, `input${i}`, `Input ${i}`, config)
			auxIds.push(muteId, prepostId, faderId)
		}
		for (let i = 1; i <= capabilities.line; i++) {
			const muteId = `aux${ai}_line${i}_mute`
			const prepostId = `aux${ai}_line${i}_prepost`
			const faderId = `aux${ai}_line${i}_fader`
			presets[muteId] = makeAuxChannelMuteButton(ai, 'l', i, `line${i}`, `Line ${i}`)
			presets[prepostId] = makeAuxChannelPrePostButton(ai, 'l', i, `line${i}`, `Line ${i}`)
			presets[faderId] = makeAuxChannelFaderButton(ai, 'l', i, `line${i}`, `Line ${i}`, config)
			auxIds.push(muteId, prepostId, faderId)
		}
		for (let i = 1; i <= capabilities.player; i++) {
			const muteId = `aux${ai}_player${i}_mute`
			const prepostId = `aux${ai}_player${i}_prepost`
			const faderId = `aux${ai}_player${i}_fader`
			presets[muteId] = makeAuxChannelMuteButton(ai, 'p', i, `player${i}`, `Player ${i}`)
			presets[prepostId] = makeAuxChannelPrePostButton(ai, 'p', i, `player${i}`, `Player ${i}`)
			presets[faderId] = makeAuxChannelFaderButton(ai, 'p', i, `player${i}`, `Player ${i}`, config)
			auxIds.push(muteId, prepostId, faderId)
		}
		for (let i = 1; i <= capabilities.fx; i++) {
			const muteId = `aux${ai}_fx${i}_mute`
			const prepostId = `aux${ai}_fx${i}_prepost`
			const faderId = `aux${ai}_fx${i}_fader`
			presets[muteId] = makeAuxChannelMuteButton(ai, 'f', i, `fx${i}`, `FX ${i}`)
			presets[prepostId] = makeAuxChannelPrePostButton(ai, 'f', i, `fx${i}`, `FX ${i}`)
			presets[faderId] = makeAuxChannelFaderButton(ai, 'f', i, `fx${i}`, `FX ${i}`, config)
			auxIds.push(muteId, prepostId, faderId)
		}
		sections.push({ id: `aux-${ai}`, name: `AUX Bus ${ai}`, definitions: auxIds })
	}

	/****** Media Player ******/
	const mediaPlayerIds: string[] = []

	presets['player_elapsed'] = {
		type: 'simple',
		name: `Player: Elapsed Time`,
		style: controlStyle('clock', `Elapsed\\n$(module:player_elapsed)`),
		steps: [],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_elapsed')

	presets['player_remaining'] = {
		type: 'simple',
		name: `Player: Remaining Time`,
		style: controlStyle('clock', `Remaining\\n$(module:player_remaining)`),
		steps: [],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_remaining')

	presets['player_previous'] = {
		type: 'simple',
		name: `Player: Previous Track`,
		style: controlStyle('prev', 'Prev', '18'),
		steps: [
			{
				down: [{ actionId: 'mediaprev', options: {} }],
				up: [],
			},
		],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_previous')

	presets['player_next'] = {
		type: 'simple',
		name: `Player: Next Track`,
		style: controlStyle('next', 'Next', '18'),
		steps: [
			{
				down: [{ actionId: 'medianext', options: {} }],
				up: [],
			},
		],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_next')

	presets['player_playstop'] = {
		type: 'simple',
		name: `Player: Play/Stop`,
		style: controlStyle('play', 'Play/\\nStop'),
		steps: [
			{
				down: [{ actionId: 'mediaplay', options: {} }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mediaplayerstate',
				options: { state: PlayerState.Playing },
				style: {
					color: WHITE,
					bgcolor: combineRgb(255, 0, 0),
					png64: tile('play', 'playing', 2),
				},
			},
			{
				feedbackId: 'mediaplayerstate',
				options: { state: PlayerState.Stopped },
				style: {
					color: WHITE,
					bgcolor: combineRgb(0, 255, 0),
					png64: tile('play', 'stopped', 2),
				},
			},
		],
	}
	mediaPlayerIds.push('player_playstop')

	presets['player_stop'] = {
		type: 'simple',
		name: `Player: Stop`,
		style: controlStyle('stop', 'Stop', '18'),
		steps: [
			{
				down: [{ actionId: 'mediastop', options: {} }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mediaplayerstate',
				options: { state: PlayerState.Playing },
				style: {
					color: WHITE,
					bgcolor: combineRgb(255, 0, 0),
					png64: tile('stop', 'playing', 1),
				},
			},
		],
	}
	mediaPlayerIds.push('player_stop')

	presets['player_pause'] = {
		type: 'simple',
		name: `Player: Pause`,
		style: controlStyle('pause', 'Pause', '18'),
		steps: [
			{
				down: [{ actionId: 'mediapause', options: {} }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mediaplayerstate',
				options: { state: PlayerState.Paused },
				style: {
					color: WHITE,
					bgcolor: combineRgb(255, 153, 51),
					png64: tile('pause', 'paused', 1),
				},
			},
		],
	}
	mediaPlayerIds.push('player_pause')

	sections.push({ id: 'media-player', name: 'Media Player', definitions: mediaPlayerIds })

	/****** Master ******/
	const masterIds: string[] = []

	presets['master_fader'] = makeMasterFaderButton(capabilities.masterDim)
	masterIds.push('master_fader')

	if (capabilities.masterDim) {
		presets['master_dim'] = {
			type: 'simple',
			name: `Master: DIM`,
			style: controlStyle('dim', 'DIM\\nMaster'),
			steps: [
				{
					down: [{ actionId: 'dimmaster', options: { dim: 2 } }],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'dimmaster',
					options: {},
					style: tileFeedbackStyle(feedbackDefaultStyles.dim, 'dim', 'dim', 2),
				},
			],
		}
		masterIds.push('master_dim')
	}
	sections.push({ id: 'master', name: 'Master', definitions: masterIds })

	return [sections, presets]
}
