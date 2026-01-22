/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React from 'react';
import { User, CreditCard, Settings as SettingsIcon, LogOut, Zap, TrendingUp } from 'lucide-react';

interface IskraUser {
	id: number;
	email: string;
	tier: 'free' | 'pro' | 'pro_plus';
	requestsUsed?: number;
	requestsTotal?: number;
}

interface IskraProfileProps {
	user: IskraUser;
	onLogout: () => void;
	onUpgrade: (tier: 'pro' | 'pro_plus') => void;
	isLoading?: boolean;
}

const tierInfo = {
	free: {
		name: 'Бесплатный',
		requests: 20,
		price: 0,
		features: ['20 запросов в день', 'Qwen Flash', 'Claude Haiku']
	},
	pro: {
		name: 'Pro',
		requests: 500,
		price: 990,
		features: ['500 запросов в день', 'Все модели', 'Приоритетная поддержка']
	},
	pro_plus: {
		name: 'Pro+',
		requests: 2000,
		price: 1990,
		features: ['2000 запросов в день', 'Все модели', 'Максимальный приоритет']
	}
};

export const IskraProfile: React.FC<IskraProfileProps> = ({ user, onLogout, onUpgrade, isLoading = false }) => {
	const currentTier = tierInfo[user.tier];
	const requestsUsed = user.requestsUsed ?? 0;
	const requestsTotal = user.requestsTotal ?? currentTier.requests;
	const requestsPercentage = (requestsUsed / requestsTotal) * 100;

	return (
		<div className="w-full max-w-4xl mx-auto">
			{/* Карточка профиля */}
			<div className="bg-void-bg-1 rounded-lg p-6 mb-6 border border-void-border-2">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#ff6600] to-[#ff7722] flex items-center justify-center">
							<User className="w-8 h-8 text-white" />
						</div>
						<div>
							<h2 className="text-xl font-medium text-void-fg-1">{user.email}</h2>
							<p className="text-void-fg-3 text-sm">ID: {user.id}</p>
						</div>
					</div>
					<button
						onClick={onLogout}
						className="flex items-center gap-2 px-4 py-2 text-sm text-void-fg-3 hover:text-red-400 transition-colors"
					>
						<LogOut className="w-4 h-4" />
						<span>Выйти</span>
					</button>
				</div>

				{/* Информация о тарифе */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="bg-void-bg-3 rounded-md p-4">
						<div className="flex items-center gap-2 mb-2">
							<CreditCard className="w-4 h-4 text-[#ff6600]" />
							<span className="text-xs text-void-fg-3 uppercase tracking-wide">Тариф</span>
						</div>
						<p className="text-lg font-medium text-void-fg-1">{currentTier.name}</p>
						{currentTier.price > 0 && (
							<p className="text-sm text-void-fg-3 mt-1">{currentTier.price}₽/месяц</p>
						)}
					</div>

					<div className="bg-void-bg-3 rounded-md p-4">
						<div className="flex items-center gap-2 mb-2">
							<SettingsIcon className="w-4 h-4 text-[#ff6600]" />
							<span className="text-xs text-void-fg-3 uppercase tracking-wide">Статус</span>
						</div>
						<p className="text-lg font-medium text-void-fg-1">Активна</p>
					</div>
				</div>
			</div>

			{/* Карточка использования */}
			<div className="bg-void-bg-1 rounded-lg p-6 mb-6 border border-void-border-2">
				<h3 className="text-lg font-medium text-void-fg-1 mb-4">Использование запросов сегодня</h3>
				
				<div className="mb-4">
					<div className="flex justify-between text-sm text-void-fg-3 mb-2">
						<span>Использовано: {requestsUsed} из {requestsTotal}</span>
						<span>{Math.round(requestsPercentage)}%</span>
					</div>
					<div className="w-full h-3 bg-void-bg-3 rounded-full overflow-hidden">
						<div 
							className="h-full bg-gradient-to-r from-[#ff6600] to-[#ff7722] transition-all duration-300"
							style={{ width: `${requestsPercentage}%` }}
						/>
					</div>
				</div>

				<p className="text-sm text-void-fg-3">
					Осталось запросов: <span className="text-void-fg-1 font-medium">{requestsTotal - requestsUsed}</span>
				</p>
				<p className="text-xs text-void-fg-3 mt-2">
					Лимит обновляется каждый день в 00:00 по московскому времени
				</p>
			</div>

			{/* Тарифные планы */}
			{user.tier === 'free' && (
				<div className="bg-void-bg-1 rounded-lg p-6 border border-void-border-2">
					<h3 className="text-lg font-medium text-void-fg-1 mb-4">Улучшите свой тариф</h3>
					
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Pro */}
						<div className="bg-void-bg-3 rounded-lg p-6 border border-void-border-2 hover:border-[#ff6600] transition-colors">
							<div className="flex items-center gap-2 mb-3">
								<Zap className="w-5 h-5 text-[#ff6600]" />
								<h4 className="text-xl font-medium text-void-fg-1">Pro</h4>
							</div>
							<p className="text-3xl font-bold text-void-fg-1 mb-4">
								990₽<span className="text-sm font-normal text-void-fg-3">/месяц</span>
							</p>
							<ul className="space-y-2 mb-6">
								{tierInfo.pro.features.map((feature, i) => (
									<li key={i} className="text-sm text-void-fg-3 flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-[#ff6600]" />
										{feature}
									</li>
								))}
							</ul>
							<button
								onClick={() => onUpgrade('pro')}
								disabled={isLoading}
								className="w-full py-2 bg-gradient-to-r from-[#ff6600] to-[#ff7722] text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoading ? 'Создание платежа...' : 'Перейти на Pro'}
							</button>
						</div>

						{/* Pro+ */}
						<div className="bg-void-bg-3 rounded-lg p-6 border-2 border-[#ff6600] relative">
							<div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-[#ff6600] to-[#ff7722] text-white text-xs font-medium rounded-full">
								Популярный
							</div>
							<div className="flex items-center gap-2 mb-3">
								<TrendingUp className="w-5 h-5 text-[#ff6600]" />
								<h4 className="text-xl font-medium text-void-fg-1">Pro+</h4>
							</div>
							<p className="text-3xl font-bold text-void-fg-1 mb-4">
								1990₽<span className="text-sm font-normal text-void-fg-3">/месяц</span>
							</p>
							<ul className="space-y-2 mb-6">
								{tierInfo.pro_plus.features.map((feature, i) => (
									<li key={i} className="text-sm text-void-fg-3 flex items-center gap-2">
										<div className="w-1.5 h-1.5 rounded-full bg-[#ff6600]" />
										{feature}
									</li>
								))}
							</ul>
							<button
								onClick={() => onUpgrade('pro_plus')}
								disabled={isLoading}
								className="w-full py-2 bg-gradient-to-r from-[#ff6600] to-[#ff7722] text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isLoading ? 'Создание платежа...' : 'Перейти на Pro+'}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
