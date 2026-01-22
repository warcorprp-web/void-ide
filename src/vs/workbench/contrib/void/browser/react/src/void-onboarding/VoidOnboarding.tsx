/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, X } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/voidSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
// import { OllamaSetupInstructions, OneClickSwitchButton, SettingsForProvider, ModelDump } from '../void-settings-tsx/Settings.js';
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { isLinux } from '../../../../../../../base/common/platform.js';

// Заглушки для удаленных компонентов
const OllamaSetupInstructions = () => null;
const OneClickSwitchButton = () => null;
const SettingsForProvider = () => null;
const ModelDump = () => null;

const OVERRIDE_VALUE = false

export const VoidOnboarding = () => {

	const voidSettingsState = useSettingsState()
	const isOnboardingComplete = voidSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE

	const isDark = useIsDark()

	return (
		<div className={`@@void-scope ${isDark ? 'dark' : ''}`}>
			<div
				className={`
					bg-void-bg-3 fixed top-0 right-0 bottom-0 left-0 width-full z-[99999]
					transition-all duration-1000 ${isOnboardingComplete ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
				`}
				style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			>
				<ErrorBoundary>
					<VoidOnboardingContent />
				</ErrorBoundary>
			</div>
		</div>
	)
}

const VoidIcon = () => {
	const accessor = useAccessor()
	const themeService = accessor.get('IThemeService')

	const divRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		// void icon style
		const updateTheme = () => {
			const theme = themeService.getColorTheme().type
			const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK
			if (divRef.current) {
				divRef.current.style.maxWidth = '220px'
				divRef.current.style.opacity = '80%'
				divRef.current.style.filter = isDark ? '' : 'invert(1)' //brightness(.5)
			}
		}
		updateTheme()
		const d = themeService.onDidColorThemeChange(updateTheme)
		return () => d.dispose()
	}, [])

	return <div ref={divRef} className='@@void-void-icon' />
}

const FADE_DURATION_MS = 2000

const FadeIn = ({ children, className, delayMs = 0, durationMs, ...props }: { children: React.ReactNode, delayMs?: number, durationMs?: number, className?: string } & React.HTMLAttributes<HTMLDivElement>) => {

	const [opacity, setOpacity] = useState(0)

	const effectiveDurationMs = durationMs ?? FADE_DURATION_MS

	useEffect(() => {

		const timeout = setTimeout(() => {
			setOpacity(1)
		}, delayMs)

		return () => clearTimeout(timeout)
	}, [setOpacity, delayMs])


	return (
		<div className={className} style={{ opacity, transition: `opacity ${effectiveDurationMs}ms ease-in-out` }} {...props}>
			{children}
		</div>
	)
}

// Onboarding

// =============================================
//  New AddProvidersPage Component and helpers
// =============================================

const tabNames = ['Free', 'Paid', 'Local'] as const;

type TabName = typeof tabNames[number] | 'Cloud/Other';

// Data for cloud providers tab
const cloudProviders: ProviderName[] = ['googleVertex', 'liteLLM', 'microsoftAzure', 'awsBedrock', 'openAICompatible'];

// Data structures for provider tabs
const providerNamesOfTab: Record<TabName, ProviderName[]> = {
	Free: ['gemini', 'openRouter'],
	Local: localProviderNames,
	Paid: providerNames.filter(pn => !(['gemini', 'openRouter', ...localProviderNames, ...cloudProviders] as string[]).includes(pn)) as ProviderName[],
	'Cloud/Other': cloudProviders,
};

const descriptionOfTab: Record<TabName, string> = {
	Free: `Providers with a 100% free tier. Add as many as you'd like!`,
	Paid: `Connect directly with any provider (bring your own key).`,
	Local: `Active providers should appear automatically. Add as many as you'd like! `,
	'Cloud/Other': `Add as many as you'd like! Reach out for custom configuration requests.`,
};


const featureNameMap: { display: string, featureName: FeatureName }[] = [
	{ display: 'Chat', featureName: 'Chat' },
	{ display: 'Quick Edit', featureName: 'Ctrl+K' },
	{ display: 'Autocomplete', featureName: 'Autocomplete' },
	{ display: 'Fast Apply', featureName: 'Apply' },
	{ display: 'Source Control', featureName: 'SCM' },
];

const AddProvidersPage = ({ pageIndex, setPageIndex }: { pageIndex: number, setPageIndex: (index: number) => void }) => {
	const [currentTab, setCurrentTab] = useState<TabName>('Free');
	const settingsState = useSettingsState();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Clear error message after 5 seconds
	useEffect(() => {
		let timeoutId: NodeJS.Timeout | null = null;

		if (errorMessage) {
			timeoutId = setTimeout(() => {
				setErrorMessage(null);
			}, 5000);
		}

		// Cleanup function to clear the timeout if component unmounts or error changes
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [errorMessage]);

	return (<div className="flex flex-col md:flex-row w-full h-[80vh] gap-6 max-w-[900px] mx-auto relative">
		{/* Left Column */}
		<div className="md:w-1/4 w-full flex flex-col gap-6 p-6 border-none border-void-border-2 h-full overflow-y-auto">
			{/* Tab Selector */}
			<div className="flex md:flex-col gap-2">
				{[...tabNames, 'Cloud/Other'].map(tab => (
					<button
						key={tab}
						className={`py-2 px-4 rounded-md text-left ${currentTab === tab
							? 'bg-[#0e70c0]/80 text-white font-medium shadow-sm'
							: 'bg-void-bg-2 hover:bg-void-bg-2/80 text-void-fg-1'
							} transition-all duration-200`}
						onClick={() => {
							setCurrentTab(tab as TabName);
							setErrorMessage(null); // Reset error message when changing tabs
						}}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Feature Checklist */}
			<div className="flex flex-col gap-1 mt-4 text-sm opacity-80">
				{featureNameMap.map(({ display, featureName }) => {
					const hasModel = settingsState.modelSelectionOfFeature[featureName] !== null;
					return (
						<div key={featureName} className="flex items-center gap-2">
							{hasModel ? (
								<Check className="w-4 h-4 text-emerald-500" />
							) : (
								<div className="w-3 h-3 rounded-full flex items-center justify-center">
									<div className="w-1 h-1 rounded-full bg-white/70"></div>
								</div>
							)}
							<span>{display}</span>
						</div>
					);
				})}
			</div>
		</div>

		{/* Right Column */}
		<div className="flex-1 flex flex-col items-center justify-start p-6 h-full overflow-y-auto">
			<div className="text-5xl mb-2 text-center w-full">Add a Provider</div>

			<div className="w-full max-w-xl mt-4 mb-10">
				<div className="text-4xl font-light my-4 w-full">{currentTab}</div>
				<div className="text-sm opacity-80 text-void-fg-3 my-4 w-full">{descriptionOfTab[currentTab]}</div>
			</div>

			{providerNamesOfTab[currentTab].map((providerName) => (
				<div key={providerName} className="w-full max-w-xl mb-10">
					<div className="text-xl mb-2">
						Add {displayInfoOfProviderName(providerName).title}
						{providerName === 'gemini' && (
							<span
								data-tooltip-id="void-tooltip-provider-info"
								data-tooltip-content="Gemini 2.5 Pro offers 25 free messages a day, and Gemini 2.5 Flash offers 500. We recommend using models down the line as you run out of free credits."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
						{providerName === 'openRouter' && (
							<span
								data-tooltip-id="void-tooltip-provider-info"
								data-tooltip-content="OpenRouter offers 50 free messages a day, and 1000 if you deposit $10. Only applies to models labeled ':free'."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
					</div>
				
					{providerName === 'ollama' && <OllamaSetupInstructions />}
				</div>
			))}

		



			{/* Navigation buttons in right column */}
			<div className="flex flex-col items-end w-full mt-auto pt-8">
				{errorMessage && (
					<div className="text-amber-400 mb-2 text-sm opacity-80 transition-opacity duration-300">{errorMessage}</div>
				)}
				<div className="flex items-center gap-2">
					<PreviousButton onClick={() => setPageIndex(pageIndex - 1)} />
					<NextButton
						onClick={() => {
							const isDisabled = isFeatureNameDisabled('Chat', settingsState)

							if (!isDisabled) {
								setPageIndex(pageIndex + 1);
								setErrorMessage(null);
							} else {
								// Show error message
								setErrorMessage("Please set up at least one Chat model before moving on.");
							}
						}}
					/>
				</div>
			</div>
		</div>
	</div>);
};
// =============================================
// 	OnboardingPage
// 		title:
// 			div
// 				"Welcome to Void"
// 			image
// 		content:<></>
// 		title
// 		content
// 		prev/next

// 	OnboardingPage
// 		title:
// 			div
// 				"How would you like to use Void?"
// 		content:
// 			ModelQuestionContent
// 				|
// 					div
// 						"I want to:"
// 					div
// 						"Use the smartest models"
// 						"Keep my data fully private"
// 						"Save money"
// 						"I don't know"
// 				| div
// 					| div
// 						"We recommend using "
// 						"Set API"
// 					| div
// 						""
// 					| div
//
// 		title
// 		content
// 		prev/next
//
// 	OnboardingPage
// 		title
// 		content
// 		prev/next

const NextButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

	// Create a new props object without the disabled attribute
	const { disabled, ...buttonProps } = props;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onDoubleClick={onClick}
			className={`px-6 py-2 bg-zinc-100 ${disabled
				? 'bg-zinc-100/40 cursor-not-allowed'
				: 'hover:bg-zinc-100'
				} rounded text-black duration-600 transition-all
			`}
			{...disabled && {
				'data-tooltip-id': 'void-tooltip',
				"data-tooltip-content": 'Please enter all required fields or choose another provider', // (double-click to proceed anyway, can come back in Settings)
				"data-tooltip-place": 'top',
			}}
			{...buttonProps}
		>
			Next
		</button>
	)
}

const PreviousButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			onClick={onClick}
			className="px-6 py-2 rounded text-void-fg-3 opacity-80 hover:brightness-115 duration-600 transition-all"
			{...props}
		>
			Back
		</button>
	)
}



const OnboardingPageShell = ({ top, bottom, content, hasMaxWidth = true, className = '', }: {
	top?: React.ReactNode,
	bottom?: React.ReactNode,
	content?: React.ReactNode,
	hasMaxWidth?: boolean,
	className?: string,
}) => {
	return (
		<div className={`h-[80vh] text-lg flex flex-col gap-4 w-full mx-auto ${hasMaxWidth ? 'max-w-[600px]' : ''} ${className}`}>
			{top && <FadeIn className='w-full mb-auto pt-16'>{top}</FadeIn>}
			{content && <FadeIn className='w-full my-auto'>{content}</FadeIn>}
			{bottom && <div className='w-full pb-8'>{bottom}</div>}
		</div>
	)
}

const OllamaDownloadOrRemoveModelButton = ({ modelName, isModelInstalled, sizeGb }: { modelName: string, isModelInstalled: boolean, sizeGb: number | false | 'not-known' }) => {
	// for now just link to the ollama download page
	return <a
		href={`https://ollama.com/library/${modelName}`}
		target="_blank"
		rel="noopener noreferrer"
		className="flex items-center justify-center text-void-fg-2 hover:text-void-fg-1"
	>
		<ExternalLink className="w-3.5 h-3.5" />
	</a>

}


const YesNoText = ({ val }: { val: boolean | null }) => {

	return <div
		className={
			val === true ? "text text-emerald-500"
				: val === false ? 'text-rose-600'
					: "text text-amber-300"
		}
	>
		{
			val === true ? "Yes"
				: val === false ? 'No'
					: "Yes*"
		}
	</div>

}



const abbreviateNumber = (num: number): string => {
	if (num >= 1000000) {
		// For millions
		return Math.floor(num / 1000000) + 'M';
	} else if (num >= 1000) {
		// For thousands
		return Math.floor(num / 1000) + 'K';
	} else {
		// For numbers less than 1000
		return num.toString();
	}
}





const PrimaryActionButton = ({ children, className, ringSize, ...props }: { children: React.ReactNode, ringSize?: undefined | 'xl' | 'screen' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {


	return (
		<button
			type='button'
			className={`
				flex items-center justify-center

				text-white dark:text-black
				bg-black/90 dark:bg-white/90

				${ringSize === 'xl' ? `
					gap-2 px-16 py-8
					transition-all duration-300 ease-in-out
					`
					: ringSize === 'screen' ? `
					gap-2 px-16 py-8
					transition-all duration-1000 ease-in-out
					`: ringSize === undefined ? `
					gap-1 px-4 py-2
					transition-all duration-300 ease-in-out
				`: ''}

				rounded-lg
				group
				${className}
			`}
			{...props}
		>
			{children}
			<ChevronRight
				className={`
					transition-all duration-300 ease-in-out

					transform
					group-hover:translate-x-1
					group-active:translate-x-1
				`}
			/>
		</button>
	)
}

// OTP Input Component - 6 отдельных полей для кода
const OTPInput = ({ value, onChange, disabled }: { value: string; onChange: (val: string) => void; disabled?: boolean }) => {
	const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

	useEffect(() => {
		// Синхронизация с внешним значением
		if (value.length === 6) {
			setOtp(value.split(''));
		}
	}, [value]);

	const handleChange = (index: number, val: string) => {
		if (disabled) return;
		
		// Разрешаем только цифры
		const newVal = val.replace(/[^0-9]/g, '');
		if (newVal.length > 1) return;

		const newOtp = [...otp];
		newOtp[index] = newVal;
		setOtp(newOtp);
		onChange(newOtp.join(''));

		// Автофокус на следующее поле
		if (newVal && index < 5) {
			inputRefs.current[index + 1]?.focus();
		}
	};

	const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Backspace' && !otp[index] && index > 0) {
			inputRefs.current[index - 1]?.focus();
		}
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6);
		const newOtp = pastedData.split('').concat(Array(6 - pastedData.length).fill(''));
		setOtp(newOtp);
		onChange(newOtp.join(''));
		
		// Фокус на последнее заполненное поле
		const lastFilledIndex = Math.min(pastedData.length, 5);
		inputRefs.current[lastFilledIndex]?.focus();
	};

	return (
		<div className="flex gap-2 justify-center">
			{otp.map((digit, index) => (
				<input
					key={index}
					ref={(el) => (inputRefs.current[index] = el)}
					type="text"
					inputMode="numeric"
					maxLength={1}
					value={digit}
					onChange={(e) => handleChange(index, e.target.value)}
					onKeyDown={(e) => handleKeyDown(index, e)}
					onPaste={handlePaste}
					disabled={disabled}
					className="w-12 h-14 text-center text-2xl font-semibold rounded-lg bg-void-bg-3 border-2 border-void-border-2 text-void-fg-1 focus:outline-none focus:border-[#ff6600] disabled:opacity-50 transition-colors"
					style={{ caretColor: '#ff6600' }}
				/>
			))}
		</div>
	);
};

// Iskra Auth Page - страница входа/регистрации
const IskraAuthPage = ({ pageIndex, setPageIndex }: { pageIndex: number; setPageIndex: (index: number) => void }) => {
	const [isLogin, setIsLogin] = useState(true);
	const [registrationStep, setRegistrationStep] = useState<'email' | 'code' | 'password'>('email');
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (errorMessage) {
			const timeout = window.setTimeout(() => setErrorMessage(null), 5000);
			return () => window.clearTimeout(timeout);
		}
	}, [errorMessage]);

	const handleSendCode = async () => {
		if (!email) {
			setErrorMessage("Пожалуйста, введите email");
			return;
		}
		setIsLoading(true);
		try {
			const response = await fetch('https://cli.cryptocatslab.ru/auth/send-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});
			if (!response.ok) throw new Error((await response.json()).message || 'Ошибка отправки кода');
			setRegistrationStep('code');
		} catch (error: any) {
			setErrorMessage(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleVerifyCode = async () => {
		if (!code) {
			setErrorMessage("Пожалуйста, введите код");
			return;
		}
		setIsLoading(true);
		try {
			const response = await fetch('https://cli.cryptocatslab.ru/auth/verify-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code })
			});
			if (!response.ok) throw new Error((await response.json()).message || 'Неверный код');
			setRegistrationStep('password');
		} catch (error: any) {
			setErrorMessage(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleCompleteRegistration = async () => {
		if (!password || !confirmPassword) {
			setErrorMessage("Пожалуйста, заполните все поля");
			return;
		}
		if (password !== confirmPassword) {
			setErrorMessage("Пароли не совпадают");
			return;
		}
		setIsLoading(true);
		try {
			// Генерируем deviceId как в Settings.tsx
			const deviceId = localStorage.getItem('iskra.deviceId') || 
				`device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
			localStorage.setItem('iskra.deviceId', deviceId);

			const response = await fetch('https://cli.cryptocatslab.ru/auth/complete-registration', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, deviceId }) // Используем deviceId, а не code!
			});
			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.error || 'Ошибка регистрации');
			}
			const data = await response.json();
			localStorage.setItem('iskra.auth.token', data.token);
			localStorage.setItem('iskra.auth.user', JSON.stringify(data.user));
			setPageIndex(pageIndex + 1);
		} catch (error: any) {
			setErrorMessage(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async () => {
		if (!email || !password) {
			setErrorMessage("Пожалуйста, заполните все поля");
			return;
		}
		setIsLoading(true);
		try {
			const response = await fetch('https://cli.cryptocatslab.ru/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});
			if (!response.ok) throw new Error((await response.json()).message || 'Ошибка входа');
			const data = await response.json();
			localStorage.setItem('iskra.auth.token', data.token);
			localStorage.setItem('iskra.auth.user', JSON.stringify(data.user));
			setPageIndex(pageIndex + 1);
		} catch (error: any) {
			setErrorMessage(error.message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col items-center space-y-6 w-full max-w-[480px] mx-auto">
			{/* Заголовок */}
			<div className="text-center mb-2">
				<div className="text-4xl font-bold mb-2">
					{isLogin ? 'Вход' : 'Регистрация'}
				</div>
				<div className="text-sm text-void-fg-3">
					{isLogin 
						? 'Войдите в свой аккаунт Искра' 
						: registrationStep === 'email' ? 'Создайте новый аккаунт'
						: registrationStep === 'code' ? 'Подтвердите ваш email'
						: 'Создайте пароль'}
				</div>
			</div>

			{/* Форма */}
			<div className="w-full bg-void-bg-1 rounded-xl p-8 border border-void-border-2 shadow-lg">
				{/* Email */}
				{(isLogin || registrationStep === 'email') && (
					<div className="mb-5">
						<label className="block text-sm font-medium text-void-fg-2 mb-2">Email</label>
						<input
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							disabled={!isLogin && registrationStep !== 'email'}
							className="w-full px-4 py-3 rounded-lg bg-void-bg-3 border-2 border-void-border-2 text-void-fg-1 focus:outline-none focus:border-[#ff6600] disabled:opacity-50 transition-colors"
							placeholder="your@email.com"
							style={{ caretColor: '#ff6600' }}
						/>
					</div>
				)}

				{/* OTP Code */}
				{!isLogin && registrationStep === 'code' && (
					<div className="mb-5">
						<label className="block text-sm font-medium text-void-fg-2 mb-3 text-center">Код подтверждения</label>
						<OTPInput value={code} onChange={setCode} disabled={isLoading} />
						<div className="text-xs text-void-fg-3 mt-3 text-center">
							Код отправлен на <span className="text-[#ff6600]">{email}</span>
						</div>
					</div>
				)}

				{/* Password */}
				{(isLogin || registrationStep === 'password') && (
					<div className="mb-5">
						<label className="block text-sm font-medium text-void-fg-2 mb-2">Пароль</label>
						<input
							type="password"
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							className="w-full px-4 py-3 rounded-lg bg-void-bg-3 border-2 border-void-border-2 text-void-fg-1 focus:outline-none focus:border-[#ff6600] transition-colors"
							placeholder="••••••••"
							style={{ caretColor: '#ff6600' }}
						/>
					</div>
				)}

				{/* Confirm Password */}
				{!isLogin && registrationStep === 'password' && (
					<div className="mb-5">
						<label className="block text-sm font-medium text-void-fg-2 mb-2">Подтвердите пароль</label>
						<input
							type="password"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
							className="w-full px-4 py-3 rounded-lg bg-void-bg-3 border-2 border-void-border-2 text-void-fg-1 focus:outline-none focus:border-[#ff6600] transition-colors"
							placeholder="••••••••"
							style={{ caretColor: '#ff6600' }}
						/>
					</div>
				)}

				{/* Error Message */}
				{errorMessage && (
					<div className="mb-4 p-3 rounded-lg bg-[#ff6600]/10 border border-[#ff6600]/30">
						<div className="text-sm text-[#ff6600] text-center">{errorMessage}</div>
					</div>
				)}

				{/* Submit Button */}
				<button
					onClick={() => {
						if (isLogin) handleLogin();
						else if (registrationStep === 'email') handleSendCode();
						else if (registrationStep === 'code') handleVerifyCode();
						else handleCompleteRegistration();
					}}
					disabled={isLoading}
					className="w-full py-3 px-4 rounded-lg text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					style={{ backgroundColor: '#ff6600' }}
					onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#ff7722')}
					onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#ff6600')}
				>
					{isLoading ? (
						<>
							<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
							<span>Загрузка...</span>
						</>
					) : (
						<>
							{isLogin ? 'Войти' : 
								registrationStep === 'email' ? 'Отправить код' :
								registrationStep === 'code' ? 'Подтвердить' :
								'Завершить регистрацию'}
							<ChevronRight size={20} />
						</>
					)}
				</button>

				{/* Back button для регистрации */}
				{!isLogin && registrationStep !== 'email' && (
					<button
						onClick={() => {
							if (registrationStep === 'code') {
								setRegistrationStep('email');
								setCode('');
							} else {
								setRegistrationStep('code');
								setPassword('');
								setConfirmPassword('');
							}
							setErrorMessage(null);
						}}
						disabled={isLoading}
						className="w-full mt-3 py-2 px-4 rounded-lg text-void-fg-2 bg-void-bg-3 hover:bg-void-bg-2 disabled:opacity-50 transition-colors text-sm"
					>
						← Назад
					</button>
				)}

				{/* Toggle между входом и регистрацией */}
				<div className="mt-6 pt-6 border-t border-void-border-2 text-center">
					<div className="text-sm text-void-fg-3">
						{isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
						<button
							onClick={() => {
								setIsLogin(!isLogin);
								setRegistrationStep('email');
								setCode('');
								setPassword('');
								setConfirmPassword('');
								setErrorMessage(null);
							}}
							disabled={isLoading}
							className="text-[#ff6600] hover:text-[#ff7722] disabled:opacity-50 font-medium transition-colors"
						>
							{isLogin ? 'Зарегистрироваться' : 'Войти'}
						</button>
					</div>
				</div>
			</div>

			{/* Информация о тарифе */}
			<div className="text-sm text-void-fg-3 text-center max-w-[400px] bg-void-bg-1/50 rounded-lg p-4 border border-void-border-2">
				<div className="flex items-center justify-center gap-2 mb-1">
					<Check size={16} className="text-[#ff6600]" />
					<span className="font-medium text-void-fg-2">Бесплатный тариф</span>
				</div>
				<div>20 запросов в день после регистрации</div>
			</div>
		</div>
	);
};


type WantToUseOption = 'smart' | 'private' | 'cheap' | 'all'

const VoidOnboardingContent = () => {


	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidMetricsService = accessor.get('IMetricsService')

	const voidSettingsState = useSettingsState()

	const [pageIndex, setPageIndex] = useState(0)


	// page 1 state
	const [wantToUseOption, setWantToUseOption] = useState<WantToUseOption>('smart')

	// Replace the single selectedProviderName with four separate states
	// page 2 state - each tab gets its own state
	const [selectedIntelligentProvider, setSelectedIntelligentProvider] = useState<ProviderName>('anthropic');
	const [selectedPrivateProvider, setSelectedPrivateProvider] = useState<ProviderName>('ollama');
	const [selectedAffordableProvider, setSelectedAffordableProvider] = useState<ProviderName>('gemini');
	const [selectedAllProvider, setSelectedAllProvider] = useState<ProviderName>('anthropic');

	// Helper function to get the current selected provider based on active tab
	const getSelectedProvider = (): ProviderName => {
		switch (wantToUseOption) {
			case 'smart': return selectedIntelligentProvider;
			case 'private': return selectedPrivateProvider;
			case 'cheap': return selectedAffordableProvider;
			case 'all': return selectedAllProvider;
		}
	}

	// Helper function to set the selected provider for the current tab
	const setSelectedProvider = (provider: ProviderName) => {
		switch (wantToUseOption) {
			case 'smart': setSelectedIntelligentProvider(provider); break;
			case 'private': setSelectedPrivateProvider(provider); break;
			case 'cheap': setSelectedAffordableProvider(provider); break;
			case 'all': setSelectedAllProvider(provider); break;
		}
	}

	const providerNamesOfWantToUseOption: { [wantToUseOption in WantToUseOption]: ProviderName[] } = {
		smart: ['anthropic', 'openAI', 'gemini', 'openRouter'],
		private: ['ollama', 'vLLM', 'openAICompatible', 'lmStudio'],
		cheap: ['gemini', 'deepseek', 'openRouter', 'ollama', 'vLLM'],
		all: providerNames,
	}


	const selectedProviderName = getSelectedProvider();
	const didFillInProviderSettings = selectedProviderName && voidSettingsState.settingsOfProvider[selectedProviderName]._didFillInProviderSettings
	const isApiKeyLongEnoughIfApiKeyExists = selectedProviderName && voidSettingsState.settingsOfProvider[selectedProviderName].apiKey ? voidSettingsState.settingsOfProvider[selectedProviderName].apiKey.length > 15 : true
	const isAtLeastOneModel = selectedProviderName && voidSettingsState.settingsOfProvider[selectedProviderName].models.length >= 1

	const didFillInSelectedProviderSettings = !!(didFillInProviderSettings && isApiKeyLongEnoughIfApiKeyExists && isAtLeastOneModel)

	const prevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
		<div className="flex items-center gap-2">
			<PreviousButton
				onClick={() => { setPageIndex(pageIndex - 1) }}
			/>
			<NextButton
				onClick={() => { setPageIndex(pageIndex + 1) }}
			/>
		</div>
	</div>


	const lastPagePrevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
		<div className="flex items-center gap-2">
			<PreviousButton
				onClick={() => { setPageIndex(pageIndex - 1) }}
			/>
			<PrimaryActionButton
				onClick={() => {
					voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
					voidMetricsService.capture('Completed Onboarding', { selectedProviderName, wantToUseOption })
				}}
				ringSize={voidSettingsState.globalSettings.isOnboardingComplete ? 'screen' : undefined}
			>Enter the Void</PrimaryActionButton>
		</div>
	</div>


	// cannot be md
	const basicDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
		smart: "Models with the best performance on benchmarks.",
		private: "Host on your computer or local network for full data privacy.",
		cheap: "Free and affordable options.",
		all: "",
	}

	// can be md
	const detailedDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
		smart: "Most intelligent and best for agent mode.",
		private: "Private-hosted so your data never leaves your computer or network. [Email us](mailto:founders@voideditor.com) for help setting up at your company.",
		cheap: "Use great deals like Gemini 2.5 Pro, or self-host a model with Ollama or vLLM for free.",
		all: "",
	}

	// Modified: initialize separate provider states on initial render instead of watching wantToUseOption changes
	useEffect(() => {
		if (selectedIntelligentProvider === undefined) {
			setSelectedIntelligentProvider(providerNamesOfWantToUseOption['smart'][0]);
		}
		if (selectedPrivateProvider === undefined) {
			setSelectedPrivateProvider(providerNamesOfWantToUseOption['private'][0]);
		}
		if (selectedAffordableProvider === undefined) {
			setSelectedAffordableProvider(providerNamesOfWantToUseOption['cheap'][0]);
		}
		if (selectedAllProvider === undefined) {
			setSelectedAllProvider(providerNamesOfWantToUseOption['all'][0]);
		}
	}, []);

	// reset the page to page 0 if the user redos onboarding
	useEffect(() => {
		if (!voidSettingsState.globalSettings.isOnboardingComplete) {
			setPageIndex(0)
		}
	}, [setPageIndex, voidSettingsState.globalSettings.isOnboardingComplete])


	const contentOfIdx: { [pageIndex: number]: React.ReactNode } = {
		0: <OnboardingPageShell
			content={
				<div className='flex flex-col items-center gap-8'>
					<div className="text-6xl font-bold text-center">
						Добро пожаловать в <span style={{ color: '#ff6600' }}>Искра</span>IDE
					</div>

					{/* Slice of Void image */}
					<div className='max-w-md w-full h-[30vh] mx-auto flex items-center justify-center'>
						{!isLinux && <VoidIcon />}
					</div>

					<div className="text-xl text-void-fg-2 text-center max-w-[600px]">
						Мощный AI-ассистент для разработки
					</div>

					<FadeIn delayMs={1000}>
						<button
							onClick={() => { setPageIndex(1) }}
							className="px-6 py-3 rounded-lg text-white text-lg font-medium transition-all flex items-center gap-2"
							style={{ backgroundColor: '#ff6600' }}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff7722'}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
						>
							Далее <ChevronRight size={20} />
						</button>
					</FadeIn>

				</div>
			}
		/>,

		1: <OnboardingPageShell hasMaxWidth={false}
			content={
				<IskraAuthPage pageIndex={pageIndex} setPageIndex={setPageIndex} />
			}
		/>,
		2: <OnboardingPageShell
			content={
				<div className="flex flex-col items-center gap-8 w-full max-w-[800px]">
					<div className="text-5xl font-bold text-center mb-2">
						Почему <span style={{ color: '#ff6600' }}>Искра</span>IDE?
					</div>
					
					<div className="text-lg text-void-fg-3 text-center max-w-[600px] mb-4">
						Полнофункциональная AI-среда разработки с топовыми моделями
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
						{/* Топовые модели */}
						<div className="bg-void-bg-1 p-6 rounded-xl border-2 border-void-border-2 hover:border-[#ff6600]/50 transition-all">
							<div className="flex items-start gap-4">
								<div className="text-[#ff6600] mt-1 flex-shrink-0">
									<Brain size={28} />
								</div>
								<div>
									<div className="text-xl font-semibold mb-2">Топовые AI модели</div>
									<div className="text-sm text-void-fg-3 leading-relaxed">
										Claude 4.5 Sonnet и Qwen 3 Coder — самые мощные модели для разработки
									</div>
								</div>
							</div>
						</div>

						{/* Оплата российскими картами */}
						<div className="bg-void-bg-1 p-6 rounded-xl border-2 border-void-border-2 hover:border-[#ff6600]/50 transition-all">
							<div className="flex items-start gap-4">
								<div className="text-[#ff6600] mt-1 flex-shrink-0">
									<DollarSign size={28} />
								</div>
								<div>
									<div className="text-xl font-semibold mb-2">Российские карты</div>
									<div className="text-sm text-void-fg-3 leading-relaxed">
										Оплата картами МИР, Visa и Mastercard российских банков через ЮKassa
									</div>
								</div>
							</div>
						</div>

						{/* Работа без VPN */}
						<div className="bg-void-bg-1 p-6 rounded-xl border-2 border-void-border-2 hover:border-[#ff6600]/50 transition-all">
							<div className="flex items-start gap-4">
								<div className="text-[#ff6600] mt-1 flex-shrink-0">
									<Lock size={28} />
								</div>
								<div>
									<div className="text-xl font-semibold mb-2">Без VPN</div>
									<div className="text-sm text-void-fg-3 leading-relaxed">
										Работает напрямую из России без необходимости использования VPN или прокси
									</div>
								</div>
							</div>
						</div>

						{/* Агентный режим */}
						<div className="bg-void-bg-1 p-6 rounded-xl border-2 border-void-border-2 hover:border-[#ff6600]/50 transition-all">
							<div className="flex items-start gap-4">
								<div className="text-[#ff6600] mt-1 flex-shrink-0">
									<Check size={28} />
								</div>
								<div>
									<div className="text-xl font-semibold mb-2">Полностью агентная IDE</div>
									<div className="text-sm text-void-fg-3 leading-relaxed">
										AI-агент с доступом к файлам, терминалу и инструментам — пишет код самостоятельно
									</div>
								</div>
							</div>
						</div>
					</div>

					<button
						onClick={() => {
							voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
							voidMetricsService.capture('Completed Onboarding', { selectedProviderName: 'iskra', wantToUseOption: 'iskra' })
						}}
						className="mt-8 px-6 py-3 rounded-lg text-white text-lg font-medium transition-all flex items-center gap-2"
						style={{ backgroundColor: '#ff6600' }}
						onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff7722'}
						onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff6600'}
					>
						Начать <ChevronRight size={20} />
					</button>
				</div>
			}
		/>,
	}


	return <div key={pageIndex} className="w-full h-[80vh] text-left mx-auto flex flex-col items-center justify-center">
		<ErrorBoundary>
			{contentOfIdx[pageIndex]}
		</ErrorBoundary>
	</div>

}
