 /*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Хелпер для проверки авторизации Искра
 */
export class IskraAuthHelper {
	private static readonly TOKEN_KEY = 'iskra.auth.token';
	private static readonly USER_KEY = 'iskra.auth.user';

	/**
	 * Проверяет, авторизован ли пользователь
	 */
	static isAuthenticated(): boolean {
		if (typeof localStorage === 'undefined') {
			return false;
		}
		const token = localStorage.getItem(this.TOKEN_KEY);
		return !!token;
	}

	/**
	 * Получает токен пользователя
	 */
	static getToken(): string | null {
		if (typeof localStorage === 'undefined') {
			return null;
		}
		return localStorage.getItem(this.TOKEN_KEY);
	}

	/**
	 * Получает информацию о пользователе
	 */
	static getUser(): any | null {
		if (typeof localStorage === 'undefined') {
			return null;
		}
		const userJson = localStorage.getItem(this.USER_KEY);
		if (!userJson) {
			return null;
		}
		try {
			return JSON.parse(userJson);
		} catch {
			return null;
		}
	}

	/**
	 * Проверяет, требуется ли авторизация для провайдера
	 */
	static requiresAuth(providerName: string): boolean {
		return providerName === 'ceillerClaude' || providerName === 'ceillerQwen';
	}

	/**
	 * Получает сообщение об ошибке для неавторизованного пользователя
	 */
	static getAuthRequiredMessage(): string {
		return 'Требуется авторизация в Искра. Откройте настройки и войдите в систему.';
	}
}
