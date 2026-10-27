import {
	combineRgb,
	type CompanionPresetDefinitions,
	type CompanionPresetDefinition,
	type CompanionPresetSection,
} from '@companion-module/base'
import { PlayerState, type SoundcraftUI } from 'soundcraft-ui-connection'
import { feedbackDefaultStyles } from './feedback.js'
import { firstValueFrom } from 'rxjs'
import type { UiSchema } from './schema.js'
import type { UiConfig } from './config.js'

/** Fader step size in dB for one tick of a rotary encoder */
const ROTARY_STEP_DB = 1

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

/**
 * Build the level lines for a fader button text.
 * The channel level variables only exist when enabled in the config,
 * so the lines are only added when the respective variables are available.
 */
function faderLevelLines(variablePart: string, config: UiConfig): string {
	const lines: string[] = []
	if (config.enableFaderLevelVars) {
		lines.push(`$(module:${variablePart}_level) dB`)
	}
	if (config.enableFaderLevelVarsPct) {
		lines.push(`$(module:${variablePart}_level_pct) %`)
	}
	return lines.map((l) => `\\n${l}`).join('')
}

/**
 * Master fader as a rotary button:
 * rotate to change the level in dB steps, press to toggle DIM (Ui24R only).
 * The button text shows the current level in dB and percent.
 */
function makeMasterFaderButton(masterDim: boolean): CompanionPresetDefinition<UiSchema> {
	return {
		type: 'simple',
		name: 'Master: Fader (rotary)',
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level'],
		style: {
			text: `MASTER\\n$(module:m_level) dB\\n$(module:m_level_pct) %`,
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
		},
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
						style: feedbackDefaultStyles.dim,
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
	return {
		type: 'simple',
		name: `Master Bus: ${namePart} Fader (rotary)`,
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level'],
		style: {
			text: `$(module:m_${variablePart}_name)${faderLevelLines(`m_${variablePart}`, config)}`,
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
		},
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
				style: feedbackDefaultStyles.mute,
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
	return {
		type: 'simple',
		name: `AUX Bus ${bus}: ${namePart} Fader (rotary)`,
		keywords: ['rotary', 'encoder', 'knob', 'volume', 'level', 'send'],
		style: {
			text: `AUX ${bus}\\n$(module:m_${variablePart}_name)${faderLevelLines(`aux${bus}_${variablePart}`, config)}`,
			size: '14',
			color: WHITE,
			bgcolor: BLACK,
		},
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
				style: feedbackDefaultStyles.mute,
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
		style: {
			text: `MUTE\\n$(module:m_${variablePart}_name)`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
				style: feedbackDefaultStyles.mute,
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
		style: {
			text: `SOLO\\n$(module:m_${variablePart}_name)`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
				style: feedbackDefaultStyles.solo,
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
		style: {
			text: `AUX ${bus}\\nMUTE\\n$(module:m_${variablePart}_name)`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
				style: feedbackDefaultStyles.mute,
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
		style: {
			text: `AUX ${bus}\\nPRE\\n$(module:m_${variablePart}_name)`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
					...feedbackDefaultStyles.post,
					text: `AUX ${bus}\\nPOST\\n$(module:m_${variablePart}_name)`,
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
		style: {
			text: `Elapsed\\n$(module:player_elapsed)`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_elapsed')

	presets['player_remaining'] = {
		type: 'simple',
		name: `Player: Remaining Time`,
		style: {
			text: `Remaining\\n$(module:player_remaining)`,
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [],
		feedbacks: [],
	}
	mediaPlayerIds.push('player_remaining')

	presets['player_previous'] = {
		type: 'simple',
		name: `Player: Previous Track`,
		style: {
			text: `|<<`,
			size: '24',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
		style: {
			text: `>>|`,
			size: '24',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
		style: {
			text: 'Play/\\nStop',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(255, 0, 0),
				},
			},
			{
				feedbackId: 'mediaplayerstate',
				options: { state: PlayerState.Stopped },
				style: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(0, 255, 0),
				},
			},
		],
	}
	mediaPlayerIds.push('player_playstop')

	presets['player_stop'] = {
		type: 'simple',
		name: `Player: Stop`,
		style: {
			text: 'STOP',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
	}
	mediaPlayerIds.push('player_stop')

	presets['player_pause'] = {
		type: 'simple',
		name: `Player: Pause`,
		style: {
			text: 'Pause',
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
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
					color: combineRgb(255, 255, 255),
					bgcolor: combineRgb(255, 153, 51),
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
			style: {
				text: `DIM Master`,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
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
					style: feedbackDefaultStyles.dim,
				},
			],
		}
		masterIds.push('master_dim')
	}
	sections.push({ id: 'master', name: 'Master', definitions: masterIds })

	return [sections, presets]
}
