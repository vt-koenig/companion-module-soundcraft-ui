import { type SomeCompanionConfigField, Regex } from '@companion-module/base'

export type UiConfig = {
	host: string
	enableFaderLevelVars?: boolean
	enableFaderLevelVarsPct?: boolean
	enablePanVars?: boolean
	rotaryStepDB?: number
}

export const instanceConfigFields: SomeCompanionConfigField[] = [
	{
		type: 'textinput',
		id: 'host',
		label: 'Target IP',
		width: 12,
		regex: Regex.IP,
		minLength: 1,
	},
	{
		type: 'static-text',
		id: 'info',
		width: 12,
		label: 'IP address change',
		value:
			'After changing the IP address of the mixer, it might be necessary to disable and re-enable the module or to restart Companion.',
	},
	{
		type: 'number',
		id: 'rotaryStepDB',
		label: 'Rotary encoder step (dB)',
		tooltip:
			'Fader change per encoder tick used by the rotary presets. Applied when a preset is dragged onto a button; existing buttons keep their value.',
		width: 6,
		min: 0.1,
		max: 12,
		step: 0.1,
		default: 1,
	},
	{
		type: 'checkbox',
		id: 'enableFaderLevelVars',
		label: 'Enable Fader Level variables (dB)',
		tooltip:
			'Creates a dB level variable for every channel on every bus. Also shows the dB level on the rotary fader presets.',
		width: 12,
		default: false,
	},
	{
		type: 'checkbox',
		id: 'enableFaderLevelVarsPct',
		label: 'Enable Fader Level variables (%)',
		tooltip:
			'Creates a percent level variable for every channel on every bus. Also shows the percent level on the rotary fader presets. The master level (m_level, m_level_pct) is always available.',
		width: 12,
		default: false,
	},
	{
		type: 'checkbox',
		id: 'enablePanVars',
		label: 'Enable PAN variables',
		width: 12,
		default: false,
	},
]
