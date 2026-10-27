import { generateEslintConfig } from '@companion-module/tools/eslint/config.mjs'

const baseConfig = await generateEslintConfig({
	enableTypescript: true,
	ignores: ['src/icons.generated.ts'],
})

const customConfig = [
	...baseConfig,
	{
		rules: {
			'@typescript-eslint/no-unsafe-enum-comparison': 'off',
			'n/no-missing-import': 'off',
		},
	},
]

export default customConfig
