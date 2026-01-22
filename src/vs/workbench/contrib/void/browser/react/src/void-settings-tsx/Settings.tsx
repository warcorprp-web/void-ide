/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { useIsDark } from '../util/services.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { IskraAuth } from './IskraAuth.js';
import { IskraProfile } from './IskraProfile.js';

// Заглушка для ToolApprovalTypeSwitch (используется в SidebarChat.tsx)
export const ToolApprovalTypeSwitch = () => null;

const API_BASE = 'https://cli.cryptocatslab.ru';

interface IskraUser {
	id: number;
	email: string;
	tier: 'free' | 'pro' | 'pro_plus';
	requestsUsed?: number;
	requestsTotal?: number;
}

export const Settings = ({ className }: { className: string }) => {
	const isDark = useIsDark();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [user, setUser] = useState<IskraUser | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	
	// Состояние для процесса регистрации
	const [authMode, setAuthMode] = useState<'login' | 'register' | 'verify' | 'password'>('login');
	const [pendingEmail, setPendingEmail] = useState('');

	// Проверка аутентификации при загрузке
	useEffect(() => {
		checkAuth();
		
		// Автоматическое обновление каждые 3 минуты (180000 мс)
		const interval = setInterval(() => {
			const token = localStorage.getItem('iskra.auth.token');
			const userJson = localStorage.getItem('iskra.auth.user');
			
			if (token && userJson) {
				const userData = JSON.parse(userJson);
				fetchUserData(token, userData);
			}
		}, 180000); // 3 минуты
		
		// Слушаем событие успешной оплаты от URL handler
		const handlePaymentSuccess = () => {
			console.log('[Settings] Payment success event received, refreshing user data...');
			checkAuth();
		};
		
		window.addEventListener('iskra-payment-success', handlePaymentSuccess);
		
		return () => {
			clearInterval(interval);
			window.removeEventListener('iskra-payment-success', handlePaymentSuccess);
		};
	}, []);

	const checkAuth = async () => {
		try {
			const token = localStorage.getItem('iskra.auth.token');
			const userJson = localStorage.getItem('iskra.auth.user');
			
			if (token && userJson) {
				const userData = JSON.parse(userJson);
				// Получаем актуальные данные с сервера
				await fetchUserData(token, userData);
			} else {
				setIsLoading(false);
			}
		} catch (err) {
			console.error('Auth check failed:', err);
			setIsLoading(false);
		}
	};

	const fetchUserData = async (token: string, userData: IskraUser) => {
		try {
			console.log('[Settings] Fetching user stats from /auth/me');
			// Получаем актуальную статистику пользователя
			const response = await fetch(`${API_BASE}/auth/me`, {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();
				console.log('[Settings] User stats received:', data);
				
				// Обновляем данные пользователя со статистикой
				const updatedUser = {
					...userData,
					...data.user,
					requestsUsed: data.usage?.requestsToday || 0,
					requestsTotal: data.usage?.limit || 20
				};
				
				console.log('[Settings] Updated user data:', updatedUser);
				localStorage.setItem('iskra.auth.user', JSON.stringify(updatedUser));
				setUser(updatedUser);
				setIsAuthenticated(true);
			} else {
				console.warn('[Settings] Failed to fetch user stats, using cached data');
				// Если не удалось получить данные, используем кэшированные с дефолтными лимитами
				const tierLimits = {
					free: 20,
					pro: 500,
					pro_plus: 2000
				};
				
				const updatedUser = {
					...userData,
					requestsUsed: userData.requestsUsed ?? 0,
					requestsTotal: userData.requestsTotal ?? tierLimits[userData.tier]
				};
				
				setUser(updatedUser);
				setIsAuthenticated(true);
			}
		} catch (err) {
			console.error('[Settings] Failed to fetch user data:', err);
			// Если не удалось получить данные, используем кэшированные
			const tierLimits = {
				free: 20,
				pro: 500,
				pro_plus: 2000
			};
			
			const updatedUser = {
				...userData,
				requestsUsed: userData.requestsUsed ?? 0,
				requestsTotal: userData.requestsTotal ?? tierLimits[userData.tier]
			};
			
			setUser(updatedUser);
			setIsAuthenticated(true);
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogin = async (email: string, password: string) => {
		console.log('[Settings] handleLogin called with email:', email);
		setIsLoading(true);
		setError(null);
		try {
			console.log('[Settings] Sending login request to:', `${API_BASE}/auth/login`);
			const response = await fetch(`${API_BASE}/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password })
			});

			console.log('[Settings] Login response status:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Login error:', errorData);
				throw new Error(errorData.message || 'Неверный email или пароль');
			}

			const data = await response.json();
			console.log('[Settings] Login successful, user data:', data.user);
			localStorage.setItem('iskra.auth.token', data.token);
			
			// Обрабатываем данные пользователя
			await fetchUserData(data.token, data.user);
			console.log('[Settings] User authenticated');
		} catch (err: any) {
			console.error('[Settings] Login failed:', err);
			setError(err.message || 'Ошибка входа');
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const handleSendCode = async (email: string) => {
		console.log('[Settings] handleSendCode called with email:', email);
		setIsLoading(true);
		setError(null);
		try {
			console.log('[Settings] Sending code request to:', `${API_BASE}/auth/send-code`);
			const response = await fetch(`${API_BASE}/auth/send-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			console.log('[Settings] Send code response status:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Send code error:', errorData);
				const errorMessage = errorData.error || 'Ошибка отправки кода';
				setError(errorMessage);
				setIsLoading(false);
				throw new Error(errorMessage);
			}

			const data = await response.json();
			console.log('[Settings] Code sent successfully:', data);
			// Код успешно отправлен - переключаем режим
			setPendingEmail(email);
			setAuthMode('verify');
			setIsLoading(false);
			console.log('[Settings] handleSendCode completed, mode switched to verify');
			return; // Успех - выходим без ошибки
		} catch (err: any) {
			console.error('[Settings] Send code failed:', err);
			// Ошибка уже обработана выше, просто пробрасываем
			setIsLoading(false);
			if (!error) {
				setError(err.message || 'Ошибка отправки кода');
			}
			throw err;
		}
	};

	const handleVerifyEmail = async (email: string, code: string) => {
		console.log('[Settings] handleVerifyEmail called with email:', email, 'code:', code);
		setIsLoading(true);
		setError(null);
		try {
			console.log('[Settings] Sending verify email request to:', `${API_BASE}/auth/verify-email`);
			const response = await fetch(`${API_BASE}/auth/verify-email`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, code })
			});

			console.log('[Settings] Verify email response status:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Verify email error:', errorData);
				const errorMessage = errorData.error || 'Неверный код подтверждения';
				setError(errorMessage);
				setIsLoading(false);
				throw new Error(errorMessage);
			}

			const data = await response.json();
			console.log('[Settings] Email verified successfully:', data);
			// Email подтвержден - переключаем режим
			setAuthMode('password');
			setIsLoading(false);
			console.log('[Settings] handleVerifyEmail completed, mode switched to password');
			return; // Успех - выходим без ошибки
		} catch (err: any) {
			console.error('[Settings] Verify email failed:', err);
			setIsLoading(false);
			if (!error) {
				setError(err.message || 'Ошибка подтверждения');
			}
			throw err;
		}
	};

	const handleCompleteRegistration = async (email: string, password: string) => {
		console.log('[Settings] handleCompleteRegistration called with email:', email);
		setIsLoading(true);
		setError(null);
		try {
			const deviceId = localStorage.getItem('iskra.deviceId') || 
				`device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
			localStorage.setItem('iskra.deviceId', deviceId);
			console.log('[Settings] Using deviceId:', deviceId);

			console.log('[Settings] Sending complete registration request to:', `${API_BASE}/auth/complete-registration`);
			const response = await fetch(`${API_BASE}/auth/complete-registration`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, password, deviceId })
			});

			console.log('[Settings] Complete registration response status:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Complete registration error:', errorData);
				throw new Error(errorData.error || 'Ошибка завершения регистрации');
			}

			const data = await response.json();
			console.log('[Settings] Registration completed successfully, user data:', data.user);
			localStorage.setItem('iskra.auth.token', data.token);
			
			// Обрабатываем данные пользователя
			await fetchUserData(data.token, data.user);
			console.log('[Settings] User authenticated after registration');
		} catch (err: any) {
			console.error('[Settings] Complete registration failed:', err);
			setError(err.message || 'Ошибка завершения регистрации');
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const handleResendCode = async (email: string) => {
		console.log('[Settings] handleResendCode called with email:', email);
		setIsLoading(true);
		setError(null);
		try {
			console.log('[Settings] Sending resend code request to:', `${API_BASE}/auth/resend-code`);
			const response = await fetch(`${API_BASE}/auth/resend-code`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email })
			});

			console.log('[Settings] Resend code response status:', response.status, response.statusText);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Resend code error:', errorData);
				throw new Error(errorData.message || 'Ошибка отправки кода');
			}

			const data = await response.json();
			console.log('[Settings] Code resent successfully:', data);
		} catch (err: any) {
			console.error('[Settings] Resend code failed:', err);
			setError(err.message || 'Ошибка отправки кода');
			throw err;
		} finally {
			setIsLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem('iskra.auth.token');
		localStorage.removeItem('iskra.auth.user');
		setUser(null);
		setIsAuthenticated(false);
	};

	const handleUpgrade = async (tier: 'pro' | 'pro_plus') => {
		console.log('[Settings] handleUpgrade called with tier:', tier);
		setIsLoading(true);
		setError(null);
		try {
			const token = localStorage.getItem('iskra.auth.token');
			if (!token) {
				throw new Error('Требуется авторизация');
			}

			console.log('[Settings] Creating payment for tier:', tier);
			const response = await fetch(`${API_BASE}/billing/create`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				},
				body: JSON.stringify({ tier })
			});

			console.log('[Settings] Payment creation response status:', response.status);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				console.error('[Settings] Payment creation error:', errorData);
				throw new Error(errorData.message || errorData.error || 'Ошибка создания платежа');
			}

			const data = await response.json();
			console.log('[Settings] Payment created:', data);

			if (!data.confirmationUrl) {
				throw new Error('Не получен URL для оплаты');
			}

			// Открываем страницу оплаты в системном браузере
			console.log('[Settings] Opening payment URL:', data.confirmationUrl);
			window.open(data.confirmationUrl, '_blank');

			// Начинаем проверять статус платежа каждые 5 секунд
			const paymentId = data.paymentId;
			let attempts = 0;
			const maxAttempts = 60; // 5 минут (60 * 5 секунд)

			const checkInterval = setInterval(async () => {
				attempts++;
				console.log(`[Settings] Checking payment status (attempt ${attempts}/${maxAttempts})`);

				try {
					const statusResponse = await fetch(`${API_BASE}/billing/status/${paymentId}`, {
						headers: { 'Authorization': `Bearer ${token}` }
					});

					if (statusResponse.ok) {
						const statusData = await statusResponse.json();
						console.log('[Settings] Payment status:', statusData);

						if (statusData.status === 'succeeded' && statusData.paid) {
							clearInterval(checkInterval);
							console.log('[Settings] Payment succeeded! Refreshing user data...');
							
							// Обновляем данные пользователя
							await checkAuth();
							
							// Показываем уведомление об успехе
							alert('✅ Оплата успешна! Подписка активирована.');
						} else if (statusData.status === 'canceled') {
							clearInterval(checkInterval);
							console.log('[Settings] Payment canceled');
							setError('Платёж отменён');
						}
					}
				} catch (err) {
					console.error('[Settings] Error checking payment status:', err);
				}

				// Останавливаем проверку через 5 минут
				if (attempts >= maxAttempts) {
					clearInterval(checkInterval);
					console.log('[Settings] Payment status check timeout');
				}
			}, 5000); // Проверяем каждые 5 секунд

		} catch (err: any) {
			console.error('[Settings] Upgrade failed:', err);
			setError(err.message || 'Ошибка создания платежа');
		} finally {
			setIsLoading(false);
		}
	};
	// Показываем загрузку при первой проверке
	if (isLoading && !isAuthenticated) {
		return (
			<div
				className={`@@void-scope ${isDark ? 'dark' : ''}`}
				style={{ width: '100%', height: '100%' }}
			>
				<div className="w-full h-full bg-void-bg-2 text-void-fg-1 flex items-center justify-center">
					<div className="text-center">
						<div className="w-12 h-12 border-4 border-[#ff6600] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-void-fg-3">Загрузка...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div
			className={`@@void-scope ${isDark ? 'dark' : ''}`}
			style={{ width: '100%', height: '100%' }}
		>
			<div className="w-full h-full bg-void-bg-2 text-void-fg-1 overflow-auto">
				<div className="max-w-4xl mx-auto p-8">
					<ErrorBoundary>
						{/* Заголовок */}
						<div className="mb-8">
							<h1 className="text-3xl font-light text-void-fg-1 mb-2">
								{isAuthenticated ? 'Профиль Искра' : 'Вход в Искра'}
							</h1>
							<p className="text-void-fg-3 text-sm">
								{isAuthenticated 
									? 'Управление вашей подпиской и запросами' 
									: 'Войдите для доступа к AI моделям'}
							</p>
						</div>

						{/* Контент */}
						{error && (
							<div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
								<p className="text-red-400 text-sm">{error}</p>
							</div>
						)}
						
						{!isAuthenticated ? (
							<IskraAuth
								onLogin={handleLogin}
								onSendCode={handleSendCode}
								onVerifyEmail={handleVerifyEmail}
								onCompleteRegistration={handleCompleteRegistration}
								onResendCode={handleResendCode}
								isLoading={isLoading}
								error={error}
								mode={authMode}
								setMode={setAuthMode}
								pendingEmail={pendingEmail}
								setPendingEmail={setPendingEmail}
							/>
						) : user ? (
							<IskraProfile
								user={user}
								onLogout={handleLogout}
								onUpgrade={handleUpgrade}
								isLoading={isLoading}
							/>
						) : (
							<div className="text-center text-void-fg-3">
								Загрузка данных пользователя...
							</div>
						)}
					</ErrorBoundary>
				</div>
			</div>
		</div>
	);
};
