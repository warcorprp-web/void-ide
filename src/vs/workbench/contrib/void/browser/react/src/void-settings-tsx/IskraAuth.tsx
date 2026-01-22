/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState } from 'react';
import { LogIn, UserPlus, Mail, Lock, Key, Loader2 } from 'lucide-react';

interface IskraAuthProps {
	onLogin: (email: string, password: string) => Promise<void>;
	onSendCode: (email: string) => Promise<void>;
	onVerifyEmail: (email: string, code: string) => Promise<void>;
	onCompleteRegistration: (email: string, password: string) => Promise<void>;
	onResendCode: (email: string) => Promise<void>;
	isLoading: boolean;
	error: string | null;
	mode: 'login' | 'register' | 'verify' | 'password';
	setMode: (mode: 'login' | 'register' | 'verify' | 'password') => void;
	pendingEmail: string;
	setPendingEmail: (email: string) => void;
}

export const IskraAuth: React.FC<IskraAuthProps> = ({
	onLogin,
	onSendCode,
	onVerifyEmail,
	onCompleteRegistration,
	onResendCode,
	isLoading,
	error,
	mode,
	setMode,
	pendingEmail,
	setPendingEmail
}) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [code, setCode] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		
		console.log('[IskraAuth] handleSubmit called, mode:', mode);
		
		try {
			if (mode === 'login') {
				console.log('[IskraAuth] Calling onLogin with email:', email);
				await onLogin(email, password);
				console.log('[IskraAuth] onLogin completed successfully');
			} else if (mode === 'register') {
				console.log('[IskraAuth] Calling onSendCode with email:', email);
				await onSendCode(email);
				console.log('[IskraAuth] onSendCode completed successfully');
				// Режим переключается в Settings.tsx
			} else if (mode === 'verify') {
				console.log('[IskraAuth] Calling onVerifyEmail with email:', pendingEmail || email, 'code:', code);
				await onVerifyEmail(pendingEmail || email, code);
				console.log('[IskraAuth] onVerifyEmail completed successfully');
				// Режим переключается в Settings.tsx
			} else if (mode === 'password') {
				console.log('[IskraAuth] Calling onCompleteRegistration with email:', pendingEmail || email);
				await onCompleteRegistration(pendingEmail || email, password);
				console.log('[IskraAuth] onCompleteRegistration completed successfully');
			}
		} catch (err) {
			console.error('[IskraAuth] Error in handleSubmit:', err);
			// Ошибка уже обработана в родительском компоненте
		}
	};

	const handleResendCode = async () => {
		await onResendCode(pendingEmail || email);
	};

	return (
		<div className="w-full max-w-md mx-auto">
			<div className="bg-void-bg-1 rounded-lg p-8 border border-void-border-2">
				{/* Заголовок */}
				<div className="text-center mb-8">
					<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#ff6600] to-[#ff7722] flex items-center justify-center">
						{mode === 'verify' ? <Key className="w-8 h-8 text-white" /> : 
						 mode === 'password' ? <Lock className="w-8 h-8 text-white" /> :
						 <LogIn className="w-8 h-8 text-white" />}
					</div>
					<h2 className="text-2xl font-light text-void-fg-1 mb-2">
						{mode === 'login' ? 'Вход в Искра' : 
						 mode === 'register' ? 'Регистрация' : 
						 mode === 'verify' ? 'Подтверждение' :
						 'Создание пароля'}
					</h2>
					<p className="text-void-fg-3 text-sm">
						{mode === 'login' ? 'Войдите для доступа к AI моделям' : 
						 mode === 'register' ? 'Введите email для регистрации' : 
						 mode === 'verify' ? 'Введите код из письма' :
						 'Создайте надежный пароль'}
					</p>
				</div>

				{/* Форма */}
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Email - для login и register */}
					{(mode === 'login' || mode === 'register') && (
						<div>
							<label className="block text-sm text-void-fg-3 mb-2">Email</label>
							<div className="relative">
								<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-void-fg-3" />
								<input
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className="w-full pl-10 pr-4 py-2 bg-void-bg-3 border border-void-border-2 rounded-md text-void-fg-1 focus:outline-none focus:border-[#ff6600] transition-colors"
									placeholder="your@email.com"
									required
									disabled={isLoading}
								/>
							</div>
						</div>
					)}

					{/* Пароль - только для login и password */}
					{(mode === 'login' || mode === 'password') && (
						<div>
							<label className="block text-sm text-void-fg-3 mb-2">
								{mode === 'password' ? 'Создайте пароль' : 'Пароль'}
							</label>
							<div className="relative">
								<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-void-fg-3" />
								<input
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className="w-full pl-10 pr-4 py-2 bg-void-bg-3 border border-void-border-2 rounded-md text-void-fg-1 focus:outline-none focus:border-[#ff6600] transition-colors"
									placeholder={mode === 'password' ? 'Минимум 8 символов' : '••••••••'}
									minLength={mode === 'password' ? 8 : undefined}
									required
									disabled={isLoading}
								/>
							</div>
							{mode === 'password' && (
								<p className="text-xs text-void-fg-3 mt-1">
									Минимум 8 символов
								</p>
							)}
						</div>
					)}

					{mode === 'verify' && (
						<div>
							<label className="block text-sm text-void-fg-3 mb-2">Код подтверждения</label>
							<div className="relative">
								<Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-void-fg-3" />
								<input
									type="text"
									value={code}
									onChange={(e) => setCode(e.target.value)}
									className="w-full pl-10 pr-4 py-2 bg-void-bg-3 border border-void-border-2 rounded-md text-void-fg-1 focus:outline-none focus:border-[#ff6600] transition-colors text-center text-2xl tracking-widest"
									placeholder="000000"
									maxLength={6}
									required
									disabled={isLoading}
								/>
							</div>
							<p className="text-xs text-void-fg-3 mt-2">
								Код отправлен на {pendingEmail || email}
							</p>
						</div>
					)}

					{/* Ошибка */}
					{error && (
						<div className="p-3 bg-red-500/10 border border-red-500/30 rounded-md">
							<p className="text-sm text-red-400">{error}</p>
						</div>
					)}

					{/* Кнопка отправки */}
					<button
						type="submit"
						disabled={isLoading}
						className="w-full py-3 bg-gradient-to-r from-[#ff6600] to-[#ff7722] text-white rounded-md font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
					>
						{isLoading ? (
							<>
								<Loader2 className="w-4 h-4 animate-spin" />
								<span>Загрузка...</span>
							</>
						) : (
							<span>
								{mode === 'login' ? 'Войти' : 
								 mode === 'register' ? 'Получить код' : 
								 mode === 'verify' ? 'Подтвердить' :
								 'Создать аккаунт'}
							</span>
						)}
					</button>

					{/* Дополнительные действия */}
					{mode === 'verify' && (
						<button
							type="button"
							onClick={handleResendCode}
							disabled={isLoading}
							className="w-full text-sm text-void-fg-3 hover:text-[#ff6600] transition-colors"
						>
							Отправить код повторно
						</button>
					)}
				</form>

				{/* Переключение режима */}
				{(mode === 'login' || mode === 'register') && (
					<div className="mt-6 text-center">
						<button
							type="button"
							onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
							className="text-sm text-void-fg-3 hover:text-[#ff6600] transition-colors"
						>
							{mode === 'login' ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
