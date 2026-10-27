import {
	combineRgb,
	type CompanionButtonStyleProps,
	type CompanionFeedbackButtonStyleResult,
	type CompanionPresetDefinitions,
	type CompanionPresetDefinition,
	type CompanionPresetSection,
} from '@companion-module/base'
import { MtkState, PlayerState, type DeviceCapabilities, type SoundcraftUI } from 'soundcraft-ui-connection'
import { feedbackDefaultStyles } from './feedback.js'
import { firstValueFrom } from 'rxjs'
import type { UiSchema } from './schema.js'
import type { UiConfig } from './config.js'
import { controlIcon, tile, type Glyph, type TileColor } from './icons.js'

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)

/** Default fader change in dB for one tick of a rotary encoder (config: rotaryStepDB) */
const DEFAULT_ROTARY_STEP_DB = 1

type TextSize = '14' | '18' | '24'
type TextLines = 1 | 2 | 3

/****************************************************************************
 * Channel lists
 *
 * One list per bus, shared by all preset kinds (MUTE, SOLO, fader, ...).
 * The variable part matches the variable IDs in variables.ts (`m_<variablePart>_name`).
 ****************************************************************************/

interface ChannelDef {
	/** Channel type as used in the action/feedback options */
	type: string
	channel: number
	/** Part of the variable ID, e.g. `input1` */
	variablePart: string
	/** Readable name, e.g. `Input 1` */
	namePart: string
	/** Tile color for fader buttons */
	color: TileColor
}

type ChannelTypeSpec = [type: string, count: number, variablePrefix: string, namePrefix: string, color: TileColor]

function channelList(specs: ChannelTypeSpec[]): ChannelDef[] {
	const list: ChannelDef[] = []
	for (const [type, count, variablePrefix, namePrefix, color] of specs) {
		for (let i = 1; i <= count; i++) {
			list.push({ type, channel: i, variablePart: `${variablePrefix}${i}`, namePart: `${namePrefix} ${i}`, color })
		}
	}
	return list
}

/** All channels on the master bus */
function masterChannels(c: DeviceCapabilities): ChannelDef[] {
	return channelList([
		['i', c.input, 'input', 'Input', 'input'],
		['l', c.line, 'line', 'Line', 'line'],
		['p', c.player, 'player', 'Player', 'player'],
		['f', c.fx, 'fx', 'FX', 'fx'],
		['s', c.sub, 'sub', 'Subgroup', 'sub'],
		['a', c.aux, 'aux', 'AUX', 'aux'],
		['v', c.vca, 'vca', 'VCA', 'vca'],
	])
}

/** Channels that can be sent to an AUX bus */
function auxChannels(c: DeviceCapabilities): ChannelDef[] {
	return channelList([
		['i', c.input, 'input', 'Input', 'aux'],
		['l', c.line, 'line', 'Line', 'aux'],
		['p', c.player, 'player', 'Player', 'aux'],
		['f', c.fx, 'fx', 'FX', 'aux'],
	])
}

/** Channels that can be sent to an FX bus */
function fxChannels(c: DeviceCapabilities): ChannelDef[] {
	return channelList([
		['i', c.input, 'input', 'Input', 'fx'],
		['l', c.line, 'line', 'Line', 'fx'],
		['p', c.player, 'player', 'Player', 'fx'],
		['s', c.sub, 'sub', 'Subgroup', 'fx'],
	])
}

/****************************************************************************
 * Button text as Companion expression
 *
 * The button text is an expression (textExpression) so that a fader at the
 * bottom shows "-inf" instead of the numeric -100 of the level variables.
 * Each part is an expression fragment; literals are quoted with lit().
 ****************************************************************************/

/** String literal for an expression */
function lit(text: string): string {
	return JSON.stringify(text)
}

/** Channel name variable */
function nameVar(variablePart: string): string {
	return `$(module:m_${variablePart}_name)`
}

/** Join expression parts with line breaks */
function textExpression(parts: string[]): string {
	return parts.join(' + "\\n" + ')
}

/** Level in dB as expression: "-inf" when the fader is at the bottom */
function levelDbExpr(variableId: string): string {
	return `($(module:${variableId}) <= -100 ? "-inf" : $(module:${variableId})) + " dB"`
}

/** Level in percent as expression */
function levelPctExpr(variableId: string): string {
	return `$(module:${variableId}) + " %"`
}

/**
 * Level parts for a channel fader. The channel level variables only exist when
 * enabled in the config, so the parts are only added when they are available.
 */
function channelLevelParts(variablePart: string, config: UiConfig): string[] {
	const parts: string[] = []
	if (config.enableFaderLevelVars) parts.push(levelDbExpr(`${variablePart}_level`))
	if (config.enableFaderLevelVarsPct) parts.push(levelPctExpr(`${variablePart}_level_pct`))
	return parts
}

function lineCount(parts: string[]): TextLines {
	return Math.min(Math.max(parts.length, 1), 3) as TextLines
}

/****************************************************************************
 * Styles of the icon pack
 ****************************************************************************/

/**
 * Button style of the icon pack: graphic as full-button image, text at the bottom.
 * Companion draws the text over the image, so the graphics keep the lower part free
 * (control icons) or dim it with a band (tiles). The top bar is disabled because it
 * would shrink the image and shift the text into the glyph.
 */
function iconStyle(parts: string[], size: TextSize, png64: string | undefined): CompanionButtonStyleProps {
	return {
		text: textExpression(parts),
		textExpression: true,
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
function controlStyle(glyph: Glyph, parts: string[], size: TextSize = '14'): CompanionButtonStyleProps {
	return iconStyle(parts, size, controlIcon(glyph))
}

/** Colored tile with glyph and a text band for the given number of lines */
function tileStyle(glyph: Glyph, color: TileColor, parts: string[]): CompanionButtonStyleProps {
	return iconStyle(parts, '14', tile(glyph, color, lineCount(parts)))
}

/** Feedback style: keep the default colors (fallback without image) and add the matching tile */
function tileFeedback(
	base: CompanionFeedbackButtonStyleResult,
	glyph: Glyph,
	color: TileColor,
	lines: TextLines,
): CompanionFeedbackButtonStyleResult {
	return { ...base, png64: tile(glyph, color, lines) }
}

/** Rotary step from the config, with fallback */
function rotaryStep(config: UiConfig): number {
	const step = Number(config.rotaryStepDB)
	return step > 0 ? step : DEFAULT_ROTARY_STEP_DB
}

const ROTARY_KEYWORDS = ['rotary', 'encoder', 'knob', 'volume', 'level']

/****************************************************************************
 * Preset builders
 ****************************************************************************/

type Preset = CompanionPresetDefinition<UiSchema>

/**
 * Master fader as a rotary button:
 * rotate to change the level in dB steps, press to toggle DIM (Ui24R only).
 * The button text shows the current level in dB and percent.
 */
function masterFaderButton(masterDim: boolean, step: number): Preset {
	const parts = [lit('MASTER'), levelDbExpr('m_level'), levelPctExpr('m_level_pct')]
	return {
		type: 'simple',
		name: 'Master: Fader (rotary)',
		keywords: ROTARY_KEYWORDS,
		style: tileStyle('knob', 'master', parts),
		steps: [
			{
				down: masterDim ? [{ actionId: 'dimmaster', options: { dim: 2 } }] : [],
				up: [],
				rotate_left: [{ actionId: 'changemastervalue', options: { value: -step } }],
				rotate_right: [{ actionId: 'changemastervalue', options: { value: step } }],
			},
		],
		feedbacks: masterDim
			? [{ feedbackId: 'dimmaster', options: {}, style: tileFeedback(feedbackDefaultStyles.dim, 'knob', 'dim', 3) }]
			: [],
	}
}

function masterDimButton(): Preset {
	return {
		type: 'simple',
		name: 'Master: DIM',
		style: controlStyle('dim', [lit('DIM'), lit('Master')]),
		steps: [{ down: [{ actionId: 'dimmaster', options: { dim: 2 } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'dimmaster', options: {}, style: tileFeedback(feedbackDefaultStyles.dim, 'dim', 'dim', 2) },
		],
	}
}

/** MUTE toggle for a channel on the master bus */
function masterMuteButton(c: ChannelDef): Preset {
	const options = { channelType: c.type, channel: c.channel }
	return {
		type: 'simple',
		name: `Master Bus: ${c.namePart} MUTE`,
		style: controlStyle('mute', [lit('MUTE'), nameVar(c.variablePart)]),
		steps: [{ down: [{ actionId: 'mutemasterchannel', options: { ...options, mute: 2 } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'mutemasterchannel', options, style: tileFeedback(feedbackDefaultStyles.mute, 'mute', 'mute', 2) },
		],
	}
}

/** SOLO toggle for a channel on the master bus */
function masterSoloButton(c: ChannelDef): Preset {
	const options = { channelType: c.type, channel: c.channel }
	return {
		type: 'simple',
		name: `Master Bus: ${c.namePart} SOLO`,
		style: controlStyle('solo', [lit('SOLO'), nameVar(c.variablePart)]),
		steps: [{ down: [{ actionId: 'solomasterchannel', options: { ...options, solo: 2 } }], up: [] }],
		feedbacks: [
			{ feedbackId: 'solomasterchannel', options, style: tileFeedback(feedbackDefaultStyles.solo, 'solo', 'solo', 2) },
		],
	}
}

/**
 * Channel fader on the master bus as a rotary button:
 * rotate to change the level in dB steps, press to toggle MUTE.
 */
function masterFaderChannelButton(c: ChannelDef, config: UiConfig): Preset {
	const options = { channelType: c.type, channel: c.channel }
	const step = rotaryStep(config)
	const parts = [nameVar(c.variablePart), ...channelLevelParts(`m_${c.variablePart}`, config)]
	return {
		type: 'simple',
		name: `Master Bus: ${c.namePart} Fader (rotary)`,
		keywords: ROTARY_KEYWORDS,
		style: tileStyle('knob', c.color, parts),
		steps: [
			{
				down: [{ actionId: 'mutemasterchannel', options: { ...options, mute: 2 } }],
				up: [],
				rotate_left: [{ actionId: 'changemasterchannelvalue', options: { ...options, value: -step } }],
				rotate_right: [{ actionId: 'changemasterchannelvalue', options: { ...options, value: step } }],
			},
		],
		feedbacks: [
			{
				feedbackId: 'mutemasterchannel',
				options,
				style: tileFeedback(feedbackDefaultStyles.mute, 'knob', 'mute', lineCount(parts)),
			},
		],
	}
}

/** Send bus kind: AUX or FX. Action and feedback IDs follow the same naming scheme. */
interface SendBusKind {
	label: 'AUX' | 'FX'
	/** Prefix of the level variables, e.g. `aux` -> `aux1_input1_level` */
	variablePrefix: 'aux' | 'fx'
	muteAction: 'muteauxchannel' | 'mutefxchannel'
	muteFeedback: 'muteauxchannel' | 'mutefxchannel'
	postAction: 'setauxchannelpost' | 'setfxchannelpost'
	postFeedback: 'postauxchannel' | 'postfxchannel'
	changeAction: 'changeauxchannelvalue' | 'changefxchannelvalue'
}

const AUX_BUS: SendBusKind = {
	label: 'AUX',
	variablePrefix: 'aux',
	muteAction: 'muteauxchannel',
	muteFeedback: 'muteauxchannel',
	postAction: 'setauxchannelpost',
	postFeedback: 'postauxchannel',
	changeAction: 'changeauxchannelvalue',
}

const FX_BUS: SendBusKind = {
	label: 'FX',
	variablePrefix: 'fx',
	muteAction: 'mutefxchannel',
	muteFeedback: 'mutefxchannel',
	postAction: 'setfxchannelpost',
	postFeedback: 'postfxchannel',
	changeAction: 'changefxchannelvalue',
}

/** MUTE toggle for a channel on a send bus */
function sendMuteButton(kind: SendBusKind, bus: number, c: ChannelDef): Preset {
	const options = { bus, channelType: c.type, channel: c.channel }
	return {
		type: 'simple',
		name: `${kind.label} Bus ${bus}: ${c.namePart} MUTE`,
		style: controlStyle('mute', [lit(`${kind.label} ${bus} MUTE`), nameVar(c.variablePart)]),
		steps: [{ down: [{ actionId: kind.muteAction, options: { ...options, mute: 2 } }], up: [] }],
		feedbacks: [
			{ feedbackId: kind.muteFeedback, options, style: tileFeedback(feedbackDefaultStyles.mute, 'mute', 'mute', 2) },
		],
	}
}

/** PRE/POST toggle for a channel on a send bus */
function sendPrePostButton(kind: SendBusKind, bus: number, c: ChannelDef): Preset {
	const options = { bus, channelType: c.type, channel: c.channel }
	return {
		type: 'simple',
		name: `${kind.label} Bus ${bus}: ${c.namePart} PRE/POST`,
		style: controlStyle('pre', [lit(`${kind.label} ${bus} PRE`), nameVar(c.variablePart)]),
		steps: [{ down: [{ actionId: kind.postAction, options: { ...options, post: 2 } }], up: [] }],
		feedbacks: [
			{
				feedbackId: kind.postFeedback,
				options,
				style: {
					...tileFeedback(feedbackDefaultStyles.post, 'post', 'post', 2),
					text: textExpression([lit(`${kind.label} ${bus} POST`), nameVar(c.variablePart)]),
				},
			},
		],
	}
}

/**
 * Channel send on an AUX or FX bus as a rotary button:
 * rotate to change the send level in dB steps, press to toggle MUTE on the bus.
 */
function sendFaderButton(kind: SendBusKind, bus: number, c: ChannelDef, config: UiConfig): Preset {
	const options = { bus, channelType: c.type, channel: c.channel }
	const step = rotaryStep(config)
	const parts = [
		lit(`${kind.label} ${bus} `) + ' + ' + nameVar(c.variablePart),
		...channelLevelParts(`${kind.variablePrefix}${bus}_${c.variablePart}`, config),
	]
	return {
		type: 'simple',
		name: `${kind.label} Bus ${bus}: ${c.namePart} Fader (rotary)`,
		keywords: [...ROTARY_KEYWORDS, 'send'],
		style: tileStyle('knob', c.color, parts),
		steps: [
			{
				down: [{ actionId: kind.muteAction, options: { ...options, mute: 2 } }],
				up: [],
				rotate_left: [{ actionId: kind.changeAction, options: { ...options, value: -step } }],
				rotate_right: [{ actionId: kind.changeAction, options: { ...options, value: step } }],
			},
		],
		feedbacks: [
			{
				feedbackId: kind.muteFeedback,
				options,
				style: tileFeedback(feedbackDefaultStyles.mute, 'knob', 'mute', lineCount(parts)),
			},
		],
	}
}

/** MUTE group / MUTE ALL / MUTE FX toggle */
function muteGroupButton(group: number | string, label: string): Preset {
	return {
		type: 'simple',
		name: `MUTE Group: ${label}`,
		style: controlStyle('mute', [lit('MUTE'), lit(label)]),
		steps: [{ down: [{ actionId: 'mutegroupmute', options: { group, mute: 2 } }], up: [] }],
		feedbacks: [
			{
				feedbackId: 'mutemutegroup',
				options: { group },
				style: tileFeedback(feedbackDefaultStyles.mute, 'mute', 'mute', 2),
			},
		],
	}
}

/** SOLO / headphone volume as a rotary button with dB and % display */
function volumeBusButton(bus: string, label: string, color: TileColor, step: number): Preset {
	const parts = [lit(label), levelDbExpr(`vol_${bus}_level`), levelPctExpr(`vol_${bus}_level_pct`)]
	return {
		type: 'simple',
		name: `${label} Volume (rotary)`,
		keywords: [...ROTARY_KEYWORDS, 'headphone', 'solo'],
		style: tileStyle('knob', color, parts),
		steps: [
			{
				down: [],
				up: [],
				rotate_left: [{ actionId: 'changevolumebusvalue', options: { bus, value: -step } }],
				rotate_right: [{ actionId: 'changevolumebusvalue', options: { bus, value: step } }],
			},
		],
		feedbacks: [],
	}
}

/** Text-only button showing a time variable */
function timeButton(name: string, label: string, variableId: string): Preset {
	return {
		type: 'simple',
		name,
		style: controlStyle('clock', [lit(label), `$(module:${variableId})`]),
		steps: [],
		feedbacks: [],
	}
}

/****************************************************************************
 * Preset catalog
 ****************************************************************************/

export async function createPresets(
	conn: SoundcraftUI,
	config: UiConfig,
): Promise<[CompanionPresetSection<UiSchema>[], CompanionPresetDefinitions<UiSchema>]> {
	const presets: CompanionPresetDefinitions<UiSchema> = {}
	const sections: CompanionPresetSection<UiSchema>[] = []
	const step = rotaryStep(config)

	const capabilities = await firstValueFrom(conn.deviceInfo.capabilities$)

	/** Register a preset and collect its ID for the section */
	function section(id: string, name: string, entries: Array<[id: string, preset: Preset]>) {
		const ids: string[] = []
		for (const [presetId, preset] of entries) {
			presets[presetId] = preset
			ids.push(presetId)
		}
		sections.push({ id, name, definitions: ids })
	}

	const master = masterChannels(capabilities)

	/****** Master Channels ******/
	section(
		'master-mute',
		'Master Channels: MUTE',
		master.map((c) => [`m_${c.variablePart}_mute`, masterMuteButton(c)]),
	)
	section(
		'master-solo',
		'Master Channels: SOLO',
		master.map((c) => [`m_${c.variablePart}_solo`, masterSoloButton(c)]),
	)
	section(
		'master-fader',
		'Master Channels: Fader (rotary)',
		master.map((c) => [`m_${c.variablePart}_fader`, masterFaderChannelButton(c, config)]),
	)

	/****** AUX Buses ******/
	const aux = auxChannels(capabilities)
	for (let bus = 1; bus <= capabilities.aux; bus++) {
		section(
			`aux-${bus}`,
			`AUX Bus ${bus}`,
			aux.flatMap((c) => [
				[`aux${bus}_${c.variablePart}_mute`, sendMuteButton(AUX_BUS, bus, c)],
				[`aux${bus}_${c.variablePart}_prepost`, sendPrePostButton(AUX_BUS, bus, c)],
				[`aux${bus}_${c.variablePart}_fader`, sendFaderButton(AUX_BUS, bus, c, config)],
			]),
		)
	}

	/****** FX Buses ******/
	const fx = fxChannels(capabilities)
	for (let bus = 1; bus <= capabilities.fx; bus++) {
		section(
			`fx-${bus}`,
			`FX Bus ${bus}`,
			fx.flatMap((c) => [
				[`fx${bus}_${c.variablePart}_mute`, sendMuteButton(FX_BUS, bus, c)],
				[`fx${bus}_${c.variablePart}_prepost`, sendPrePostButton(FX_BUS, bus, c)],
				[`fx${bus}_${c.variablePart}_fader`, sendFaderButton(FX_BUS, bus, c, config)],
			]),
		)
	}

	/****** MUTE Groups ******/
	section('mute-groups', 'MUTE Groups', [
		...[1, 2, 3, 4, 5, 6].map((g): [string, Preset] => [`mutegroup_${g}`, muteGroupButton(g, `Group ${g}`)]),
		['mutegroup_all', muteGroupButton('all', 'ALL')],
		['mutegroup_fx', muteGroupButton('fx', 'FX')],
	])

	/****** SOLO / Headphone Volume ******/
	section('volume-buses', 'SOLO / Headphone Volume', [
		['vol_solo', volumeBusButton('solo', 'SOLO', 'solo', step)],
		['vol_hp1', volumeBusButton('hp1', 'Phones 1', 'phones', step)],
		['vol_hp2', volumeBusButton('hp2', 'Phones 2', 'phones', step)],
	])

	/****** Media Player ******/
	section('media-player', 'Media Player', [
		['player_elapsed', timeButton('Player: Elapsed Time', 'Elapsed', 'player_elapsed')],
		['player_remaining', timeButton('Player: Remaining Time', 'Remaining', 'player_remaining')],
		[
			'player_previous',
			{
				type: 'simple',
				name: 'Player: Previous Track',
				style: controlStyle('prev', [lit('Prev')], '18'),
				steps: [{ down: [{ actionId: 'mediaprev', options: {} }], up: [] }],
				feedbacks: [],
			},
		],
		[
			'player_next',
			{
				type: 'simple',
				name: 'Player: Next Track',
				style: controlStyle('next', [lit('Next')], '18'),
				steps: [{ down: [{ actionId: 'medianext', options: {} }], up: [] }],
				feedbacks: [],
			},
		],
		[
			'player_playstop',
			{
				type: 'simple',
				name: 'Player: Play/Stop',
				style: controlStyle('play', [lit('Play/'), lit('Stop')]),
				steps: [{ down: [{ actionId: 'mediaplay', options: {} }], up: [] }],
				feedbacks: [
					{
						feedbackId: 'mediaplayerstate',
						options: { state: PlayerState.Playing },
						style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('play', 'playing', 2) },
					},
					{
						feedbackId: 'mediaplayerstate',
						options: { state: PlayerState.Stopped },
						style: { color: WHITE, bgcolor: combineRgb(0, 255, 0), png64: tile('play', 'stopped', 2) },
					},
				],
			},
		],
		[
			'player_stop',
			{
				type: 'simple',
				name: 'Player: Stop',
				style: controlStyle('stop', [lit('Stop')], '18'),
				steps: [{ down: [{ actionId: 'mediastop', options: {} }], up: [] }],
				feedbacks: [
					{
						feedbackId: 'mediaplayerstate',
						options: { state: PlayerState.Playing },
						style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('stop', 'playing', 1) },
					},
				],
			},
		],
		[
			'player_pause',
			{
				type: 'simple',
				name: 'Player: Pause',
				style: controlStyle('pause', [lit('Pause')], '18'),
				steps: [{ down: [{ actionId: 'mediapause', options: {} }], up: [] }],
				feedbacks: [
					{
						feedbackId: 'mediaplayerstate',
						options: { state: PlayerState.Paused },
						style: { color: WHITE, bgcolor: combineRgb(255, 153, 51), png64: tile('pause', 'paused', 1) },
					},
				],
			},
		],
	])

	/****** 2-Track Recorder ******/
	section('dualtrack', '2-Track Recorder', [
		[
			'dualtrack_record',
			{
				type: 'simple',
				name: '2-Track: Record',
				style: controlStyle('rec', [lit('2-Track'), lit('REC')]),
				steps: [{ down: [{ actionId: 'dualtrackrecordtoggle', options: {} }], up: [] }],
				feedbacks: [
					{
						feedbackId: 'dualtrackrecordstate',
						options: { state: 'rec' },
						style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('rec', 'recording', 2) },
					},
				],
			},
		],
	])

	/****** Multitrack Recorder (Ui24R) ******/
	if (capabilities.multitrack) {
		section('multitrack', 'Multitrack Recorder', [
			[
				'mtk_playstop',
				{
					type: 'simple',
					name: 'Multitrack: Play/Stop',
					style: controlStyle('play', [lit('MTK'), lit('Play')]),
					steps: [{ down: [{ actionId: 'mtkplay', options: {} }], up: [] }],
					feedbacks: [
						{
							feedbackId: 'mtkplayerstate',
							options: { state: MtkState.Playing },
							style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('play', 'playing', 2) },
						},
						{
							feedbackId: 'mtkplayerstate',
							options: { state: MtkState.Stopped },
							style: { color: WHITE, bgcolor: combineRgb(0, 255, 0), png64: tile('play', 'stopped', 2) },
						},
					],
				},
			],
			[
				'mtk_stop',
				{
					type: 'simple',
					name: 'Multitrack: Stop',
					style: controlStyle('stop', [lit('MTK Stop')]),
					steps: [{ down: [{ actionId: 'mtkstop', options: {} }], up: [] }],
					feedbacks: [
						{
							feedbackId: 'mtkplayerstate',
							options: { state: MtkState.Playing },
							style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('stop', 'playing', 1) },
						},
					],
				},
			],
			[
				'mtk_pause',
				{
					type: 'simple',
					name: 'Multitrack: Pause',
					style: controlStyle('pause', [lit('MTK Pause')]),
					steps: [{ down: [{ actionId: 'mtkpause', options: {} }], up: [] }],
					feedbacks: [
						{
							feedbackId: 'mtkplayerstate',
							options: { state: MtkState.Paused },
							style: { color: WHITE, bgcolor: combineRgb(255, 153, 51), png64: tile('pause', 'paused', 1) },
						},
					],
				},
			],
			[
				'mtk_record',
				{
					type: 'simple',
					name: 'Multitrack: Record',
					style: controlStyle('rec', [lit('MTK'), lit('REC')]),
					steps: [{ down: [{ actionId: 'mtkrecordtoggle', options: {} }], up: [] }],
					feedbacks: [
						{
							feedbackId: 'mtkrecordstate',
							options: { state: 'rec' },
							style: { color: WHITE, bgcolor: combineRgb(255, 0, 0), png64: tile('rec', 'recording', 2) },
						},
					],
				},
			],
			[
				'mtk_soundcheck',
				{
					type: 'simple',
					name: 'Multitrack: Soundcheck',
					style: controlStyle('rec', [lit('Sound-'), lit('check')]),
					steps: [{ down: [{ actionId: 'mtksoundcheck', options: { state: 2 } }], up: [] }],
					feedbacks: [
						{
							feedbackId: 'mtksoundcheckstate',
							options: {},
							style: { color: WHITE, bgcolor: combineRgb(255, 153, 51), png64: tile('rec', 'paused', 2) },
						},
					],
				},
			],
			['mtk_elapsed', timeButton('Multitrack: Elapsed Time', 'MTK Elapsed', 'mtk_elapsed')],
			['mtk_remaining', timeButton('Multitrack: Remaining Time', 'MTK Remaining', 'mtk_remaining')],
		])
	}

	/****** Master ******/
	section('master', 'Master', [
		['master_fader', masterFaderButton(capabilities.masterDim, step)],
		...(capabilities.masterDim ? [['master_dim', masterDimButton()] as [string, Preset]] : []),
	])

	return [sections, presets]
}
