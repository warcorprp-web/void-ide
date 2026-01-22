/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useEffect, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, X, CreditCard } from 'lucide-react';
import { useSettingsState } from '../util/services.js';
import { errorDetails } from '../../../../common/sendLLMMessageTypes.js';


export const ErrorDisplay = ({
	message: message_,
	fullError,
	onDismiss,
	showDismiss,
}: {
	message: string,
	fullError: Error | null,
	onDismiss: (() => void) | null,
	showDismiss?: boolean,
}) => {
	const [isExpanded, setIsExpanded] = useState(false);

	const details = errorDetails(fullError)
	const isExpandable = !!details

	const message = message_ + ''

	// Проверяем, является ли это ошибкой лимита запросов
	const isLimitError = message.toLowerCase().includes('лимит') || 
	                     message.toLowerCase().includes('запрос') ||
	                     message.toLowerCase().includes('limit') ||
	                     message.toLowerCase().includes('request') ||
	                     message.includes('429') ||
	                     message.includes('quota');

	const handleUpgradeClick = () => {
		// Открываем настройки (профиль)
		const vscode = (window as any).vscode;
		if (vscode) {
			vscode.postMessage({
				type: 'command',
				command: 'void.openSettings'
			});
		}
	};

	return (
		<div className={`rounded-lg border border-red-500/30 bg-void-bg-3 p-4 overflow-auto`}>
			{/* Header */}
			<div className='flex items-start justify-between'>
				<div className='flex gap-3'>
					<AlertCircle className='h-5 w-5 text-red-400 mt-0.5' />
					<div className='flex-1'>
						<h3 className='font-semibold text-red-400'>
							{isLimitError ? 'Лимит запросов исчерпан' : 'Ошибка'}
						</h3>
						<p className='text-void-fg-2 mt-1'>
							{message}
						</p>
						
						{/* Кнопка для перехода в профиль при ошибке лимита */}
						{isLimitError && (
							<button
								onClick={handleUpgradeClick}
								className='mt-3 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#ff6600] to-[#ff7722] text-white rounded-md font-medium hover:opacity-90 transition-opacity text-sm'
							>
								<CreditCard className='h-4 w-4' />
								<span>Перейти в профиль</span>
							</button>
						)}
					</div>
				</div>

				<div className='flex gap-2'>
					{isExpandable && (
						<button className='text-red-400 hover:text-red-300 p-1 rounded'
							onClick={() => setIsExpanded(!isExpanded)}
						>
							{isExpanded ? (
								<ChevronUp className='h-5 w-5' />
							) : (
								<ChevronDown className='h-5 w-5' />
							)}
						</button>
					)}
					{showDismiss && onDismiss && (
						<button className='text-red-400 hover:text-red-300 p-1 rounded'
							onClick={onDismiss}
						>
							<X className='h-5 w-5' />
						</button>
					)}
				</div>
			</div>

			{/* Expandable Details */}
			{isExpanded && details && (
				<div className='mt-4 space-y-3 border-t border-red-500/30 pt-3 overflow-auto'>
					<div>
						<span className='font-semibold text-red-400'>Полная ошибка: </span>
						<pre className='text-void-fg-3 text-xs'>{details}</pre>
					</div>
				</div>
			)}
		</div>
	);
};
