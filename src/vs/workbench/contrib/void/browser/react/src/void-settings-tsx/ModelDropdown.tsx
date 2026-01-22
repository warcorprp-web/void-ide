/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeatureName, featureNames, isFeatureNameDisabled, ModelSelection, modelSelectionsEqual, ProviderName, providerNames, SettingsOfProvider, displayInfoOfProviderName } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js'
import { useSettingsState, useRefreshModelState, useAccessor } from '../util/services.js'
import { _VoidSelectBox, VoidCustomDropdownBox } from '../util/inputs.js'
import { SelectBox } from '../../../../../../../base/browser/ui/selectBox/selectBox.js'
import { IconWarning } from '../sidebar-tsx/SidebarChat.js'
import { VOID_OPEN_SETTINGS_ACTION_ID, VOID_TOGGLE_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js'
import { modelFilterOfFeatureName, ModelOption } from '../../../../../../../workbench/contrib/void/common/voidSettingsService.js'
import { WarningBox } from './WarningBox.js'
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js'
import { Zap, Cpu, Target, Gauge } from 'lucide-react'
import { useFloating, autoUpdate, offset, flip, shift, size } from '@floating-ui/react-dom'

const optionsEqual = (m1: ModelOption[], m2: ModelOption[]) => {
	if (m1.length !== m2.length) return false
	for (let i = 0; i < m1.length; i++) {
		if (!modelSelectionsEqual(m1[i].selection, m2[i].selection)) return false
	}
	return true
}

// Функция для получения описания и иконки модели
const getModelInfo = (option: ModelOption): { description: string; icon: React.ReactNode; priority: number } => {
	const { providerName, modelName } = option.selection
	
	// Описания для Искра | Anthropic (от самой мощной к самой слабой)
	if (providerName === 'ceillerClaude') {
		if (modelName === 'claude-sonnet-4-5') return { 
			description: 'Самая мощная модель', 
			icon: <Gauge size={12} className="text-[#ff6600]" />,
			priority: 1
		}
		if (modelName === 'claude-sonnet-4-5-20250929') return { 
			description: 'Быстрая и мощная', 
			icon: <Zap size={12} className="text-[#ff6600]" />,
			priority: 2
		}
		if (modelName === 'claude-sonnet-4-20250514') return { 
			description: 'Сбалансированная', 
			icon: <Target size={12} className="text-[#ff6600]" />,
			priority: 3
		}
		if (modelName === 'claude-3-7-sonnet-20250219') return { 
			description: 'Точная и надежная', 
			icon: <Target size={12} className="text-[#ff6600]" />,
			priority: 4
		}
		if (modelName === 'claude-haiku-4-5') return { 
			description: 'Самая быстрая', 
			icon: <Zap size={12} className="text-[#ff6600]" />,
			priority: 5
		}
	}
	
	// Описания для Искра | Alibaba (от самой мощной к самой слабой)
	if (providerName === 'ceillerQwen') {
		if (modelName === 'qwen3-coder-plus') return { 
			description: 'Для сложного кода', 
			icon: <Cpu size={12} className="text-[#ff6600]" />,
			priority: 1
		}
		if (modelName === 'qwen3-coder-flash') return { 
			description: 'Быстрая для кода', 
			icon: <Zap size={12} className="text-[#ff6600]" />,
			priority: 2
		}
	}
	
	return { 
		description: displayInfoOfProviderName(option.selection.providerName).title, 
		icon: null,
		priority: 999
	}
}

// Группировка и сортировка моделей
const groupAndSortModels = (options: ModelOption[]): { provider: string; models: ModelOption[] }[] => {
	const groups: { [key: string]: ModelOption[] } = {}
	
	// Группируем по провайдерам
	options.forEach(option => {
		const providerName = option.selection.providerName
		if (!groups[providerName]) {
			groups[providerName] = []
		}
		groups[providerName].push(option)
	})
	
	// Сортируем модели внутри каждой группы по priority
	Object.keys(groups).forEach(providerName => {
		groups[providerName].sort((a, b) => {
			const aInfo = getModelInfo(a)
			const bInfo = getModelInfo(b)
			return aInfo.priority - bInfo.priority
		})
	})
	
	// Формируем результат с приоритетом для ceillerClaude и ceillerQwen
	const result: { provider: string; models: ModelOption[] }[] = []
	
	// Сначала добавляем Искра провайдеры
	if (groups['ceillerClaude']) {
		result.push({ provider: 'Искра | Anthropic', models: groups['ceillerClaude'] })
	}
	if (groups['ceillerQwen']) {
		result.push({ provider: 'Искра | Alibaba', models: groups['ceillerQwen'] })
	}
	
	// Затем остальные провайдеры
	Object.keys(groups).forEach(providerName => {
		if (providerName !== 'ceillerClaude' && providerName !== 'ceillerQwen') {
			result.push({ 
				provider: displayInfoOfProviderName(providerName as ProviderName).title, 
				models: groups[providerName] 
			})
		}
	})
	
	return result
}

const ModelSelectBox = ({ options, featureName, className }: { options: ModelOption[], featureName: FeatureName, className: string }) => {
	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')

	const selection = voidSettingsService.state.modelSelectionOfFeature[featureName]
	const selectedOption = selection ? voidSettingsService.state._modelOptions.find(v => modelSelectionsEqual(v.selection, selection))! : options[0]

	const [isOpen, setIsOpen] = useState(false)

	const onChangeOption = useCallback((newOption: ModelOption) => {
		voidSettingsService.setModelSelectionOfFeature(featureName, newOption.selection)
		setIsOpen(false)
	}, [voidSettingsService, featureName])

	// Группируем и сортируем модели
	const groupedModels = useMemo(() => groupAndSortModels(options), [options])

	// Floating UI setup
	const { x, y, strategy, refs } = useFloating({
		open: isOpen,
		onOpenChange: setIsOpen,
		placement: 'bottom-start',
		middleware: [
			offset(4),
			flip({ padding: 8 }),
			shift({ padding: 8 }),
			size({
				apply({ availableHeight, elements }) {
					Object.assign(elements.floating.style, {
						maxHeight: `${Math.min(availableHeight - 8, 400)}px`,
						overflowY: 'auto',
					})
				},
				padding: 8,
			}),
		],
		whileElementsMounted: autoUpdate,
		strategy: 'fixed',
	})

	// Закрытие при клике вне компонента
	useEffect(() => {
		if (!isOpen) return
		
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node
			const floating = refs.floating.current
			const reference = refs.reference.current
			
			if (
				floating &&
				reference &&
				!floating.contains(target) &&
				!reference.contains(target)
			) {
				setIsOpen(false)
			}
		}
		
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [isOpen, refs.floating, refs.reference])

	if (!selectedOption) return null

	return (
		<div className={`inline-block ${className}`}>
			{/* Кнопка выбора - УЛУЧШЕННЫЙ ДИЗАЙН */}
			<button
				type="button"
				ref={refs.setReference}
				className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-void-bg-2 border border-void-border-2 hover:border-[#ff6600] hover:bg-void-bg-3 transition-all duration-200 shadow-sm hover:shadow-md"
				onClick={() => setIsOpen(!isOpen)}
			>
				{getModelInfo(selectedOption).icon}
				<span className="text-xs font-medium text-void-fg-1 truncate max-w-[150px]">{selectedOption.selection.modelName}</span>
				<svg
					className={`w-3 h-3 transition-transform flex-shrink-0 text-void-fg-3 ${isOpen ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{/* Выпадающий список */}
			{isOpen && (
				<div 
					ref={refs.setFloating}
					style={{
						position: strategy,
						top: y ?? 0,
						left: x ?? 0,
						minWidth: '320px',
						zIndex: 999999,
					}}
					className="bg-void-bg-2 border border-void-border-2 rounded-lg shadow-xl"
				>
					{groupedModels.map((group, groupIdx) => (
						<div key={group.provider} className="block">
							{/* Заголовок группы */}
							<div className="px-3 py-2 text-xs font-semibold text-void-fg-2 bg-void-bg-3 border-b border-void-border-3 sticky top-0 z-10 first:rounded-t-lg">
								{group.provider}
							</div>
							
							{/* Модели в группе - каждая в отдельном блоке */}
							{group.models.map((option, idx) => {
								const isSelected = modelSelectionsEqual(option.selection, selectedOption.selection)
								const modelInfo = getModelInfo(option)
								const isLastInGroup = idx === group.models.length - 1
								const isLastGroup = groupIdx === groupedModels.length - 1
								
								return (
									<button
										key={option.selection.modelName}
										type="button"
										className={`block w-full text-left px-3 py-2.5 hover:bg-void-bg-3 transition-all duration-150 ${
											isSelected ? 'bg-void-bg-3 border-l-2 border-[#ff6600]' : ''
										} ${isLastInGroup && isLastGroup ? 'rounded-b-lg' : ''}`}
										onClick={() => onChangeOption(option)}
									>
										{/* Название модели */}
										<div className="flex items-center gap-2 mb-1">
											{modelInfo.icon}
											<span className={`text-sm font-medium truncate ${isSelected ? 'text-[#ff6600]' : 'text-void-fg-1'}`}>
												{option.selection.modelName}
											</span>
										</div>
										
										{/* Описание */}
										<div className="text-xs text-void-fg-3 pl-5">
											{modelInfo.description}
										</div>
									</button>
								)
							})}
							
							{/* Разделитель между группами */}
							{groupIdx < groupedModels.length - 1 && (
								<div className="border-b border-void-border-3" />
							)}
						</div>
					))}
				</div>
			)}
		</div>
	)
}


const MemoizedModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()
	const oldOptionsRef = useRef<ModelOption[]>([])
	const [memoizedOptions, setMemoizedOptions] = useState(oldOptionsRef.current)

	const { filter, emptyMessage } = modelFilterOfFeatureName[featureName]

	useEffect(() => {
		const oldOptions = oldOptionsRef.current
		const newOptions = settingsState._modelOptions.filter((o) => filter(o.selection, { chatMode: settingsState.globalSettings.chatMode, overridesOfModel: settingsState.overridesOfModel }))

		if (!optionsEqual(oldOptions, newOptions)) {
			setMemoizedOptions(newOptions)
		}
		oldOptionsRef.current = newOptions
	}, [settingsState._modelOptions, filter])

	if (memoizedOptions.length === 0) { // Pretty sure this will never be reached unless filter is enabled
		return <WarningBox text={emptyMessage?.message || 'No models available'} />
	}

	return <ModelSelectBox featureName={featureName} options={memoizedOptions} className={className} />

}

export const ModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')

	const openSettings = () => { commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID); };


	const { emptyMessage } = modelFilterOfFeatureName[featureName]

	const isDisabled = isFeatureNameDisabled(featureName, settingsState)
	if (isDisabled)
		return <WarningBox onClick={openSettings} text={
			emptyMessage && emptyMessage.priority === 'always' ? emptyMessage.message :
				isDisabled === 'needToEnableModel' ? 'Enable a model'
					: isDisabled === 'addModel' ? 'Add a model'
						: (isDisabled === 'addProvider' || isDisabled === 'notFilledIn' || isDisabled === 'providerNotAutoDetected') ? 'Provider required'
							: 'Provider required'
		} />

	return <ErrorBoundary>
		<MemoizedModelDropdown featureName={featureName} className={className} />
	</ErrorBoundary>
}
