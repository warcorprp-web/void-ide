/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, InstantiationType } from '../../../../platform/instantiation/common/extensions.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { Emitter, Event } from '../../../../base/common/event.js';

const ISKRA_API_BASE_URL = 'https://cli.cryptocatslab.ru';
const ISKRA_TOKEN_KEY = 'iskra.auth.token';
const ISKRA_USER_KEY = 'iskra.auth.user';

export interface IskraUser {
	id: number;
	email: string;
	tier: 'free' | 'pro' | 'pro_plus';
	requestsUsed?: number;
	requestsTotal?: number;
}

export interface IskraAuthResponse {
	token: string;
	user: IskraUser;
}

export interface IskraRegisterRequest {
	email: string;
	password: string;
	deviceId: string;
}

export interface IskraVerifyRequest {
	email: string;
	code: string;
}

export interface IskraLoginRequest {
	email: string;
	password: string;
}

export interface IskraAIRequest {
	model: string;
	messages: Array<{ role: string; content: string }>;
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
	tools?: any[];
}

export interface IskraPaymentRequest {
	tier: 'pro' | 'pro_plus';
	returnUrl: string;
}

export interface IskraPaymentResponse {
	paymentId: string;
	confirmationUrl: string;
	amount: number;
}

export const IIskraApiService = createDecorator<IIskraApiService>('IskraApiService');

export interface IIskraApiService {
	readonly _serviceBrand: undefined;

	readonly onDidChangeAuth: Event<IskraUser | null>;

	// Auth - новая 3-шаговая регистрация
	sendCode(email: string): Promise<{ message: string; email: string }>;
	verifyEmail(email: string, code: string): Promise<{ message: string; email: string }>;
	completeRegistration(email: string, password: string): Promise<IskraAuthResponse>;
	login(email: string, password: string): Promise<IskraAuthResponse>;
	resendCode(email: string): Promise<{ message: string }>;
	logout(): void;

	// State
	isAuthenticated(): boolean;
	getUser(): IskraUser | null;
	getToken(): string | null;

	// AI
	qwenComplete(request: IskraAIRequest): Promise<any>;
	claudeComplete(request: IskraAIRequest): Promise<any>;
	qwenStream(request: IskraAIRequest): Promise<ReadableStream>;
	claudeStream(request: IskraAIRequest): Promise<ReadableStream>;

	// Billing
	createPayment(tier: 'pro' | 'pro_plus', returnUrl: string): Promise<IskraPaymentResponse>;
	checkPaymentStatus(paymentId: string): Promise<any>;

	// Models
	getQwenModels(): Promise<string[]>;
	getClaudeModels(): Promise<string[]>;
}

class IskraApiService extends Disposable implements IIskraApiService {
	readonly _serviceBrand: undefined;

	private readonly _onDidChangeAuth = this._register(new Emitter<IskraUser | null>());
	readonly onDidChangeAuth = this._onDidChangeAuth.event;

	private _token: string | null = null;
	private _user: IskraUser | null = null;

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();

		// Load saved auth state
		this._token = this.storageService.get(ISKRA_TOKEN_KEY, StorageScope.APPLICATION) || null;
		const userJson = this.storageService.get(ISKRA_USER_KEY, StorageScope.APPLICATION);
		if (userJson) {
			try {
				this._user = JSON.parse(userJson);
			} catch (e) {
				console.error('Failed to parse user data', e);
			}
		}
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${ISKRA_API_BASE_URL}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...options.headers as Record<string, string>
		};

		if (this._token && !endpoint.startsWith('/auth/')) {
			headers['Authorization'] = `Bearer ${this._token}`;
		}

		const response = await fetch(url, {
			...options,
			headers
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({ message: response.statusText }));
			throw new Error(error.message || `HTTP ${response.status}`);
		}

		return response.json();
	}

	private saveAuth(token: string, user: IskraUser): void {
		this._token = token;
		this._user = user;

		this.storageService.store(ISKRA_TOKEN_KEY, token, StorageScope.APPLICATION, StorageTarget.MACHINE);
		this.storageService.store(ISKRA_USER_KEY, JSON.stringify(user), StorageScope.APPLICATION, StorageTarget.MACHINE);

		this._onDidChangeAuth.fire(user);
	}

	// Auth methods - новая 3-шаговая регистрация
	async sendCode(email: string): Promise<{ message: string; email: string }> {
		return this.request<{ message: string; email: string }>('/auth/send-code', {
			method: 'POST',
			body: JSON.stringify({ email })
		});
	}

	async verifyEmail(email: string, code: string): Promise<{ message: string; email: string }> {
		return this.request<{ message: string; email: string }>('/auth/verify-email', {
			method: 'POST',
			body: JSON.stringify({ email, code })
		});
	}

	async completeRegistration(email: string, password: string): Promise<IskraAuthResponse> {
		const storedDeviceId = this.storageService.get('iskra.deviceId', StorageScope.APPLICATION);
		const deviceId = storedDeviceId || await this.generateDeviceId();
		this.storageService.store('iskra.deviceId', deviceId, StorageScope.APPLICATION, StorageTarget.MACHINE);

		const response = await this.request<IskraAuthResponse>('/auth/complete-registration', {
			method: 'POST',
			body: JSON.stringify({ email, password, deviceId })
		});

		this.saveAuth(response.token, response.user);
		return response;
	}

	async login(email: string, password: string): Promise<IskraAuthResponse> {
		const response = await this.request<IskraAuthResponse>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password })
		});

		this.saveAuth(response.token, response.user);
		return response;
	}

	async resendCode(email: string): Promise<{ message: string }> {
		return this.request<{ message: string }>('/auth/resend-code', {
			method: 'POST',
			body: JSON.stringify({ email })
		});
	}

	logout(): void {
		this._token = null;
		this._user = null;

		this.storageService.remove(ISKRA_TOKEN_KEY, StorageScope.APPLICATION);
		this.storageService.remove(ISKRA_USER_KEY, StorageScope.APPLICATION);

		this._onDidChangeAuth.fire(null);
	}

	isAuthenticated(): boolean {
		return !!this._token && !!this._user;
	}

	getUser(): IskraUser | null {
		return this._user;
	}

	getToken(): string | null {
		return this._token;
	}

	// AI methods
	async qwenComplete(request: IskraAIRequest): Promise<any> {
		return this.request('/ai/qwen/complete', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	async claudeComplete(request: IskraAIRequest): Promise<any> {
		return this.request('/ai/claude/complete', {
			method: 'POST',
			body: JSON.stringify(request)
		});
	}

	async qwenStream(request: IskraAIRequest): Promise<ReadableStream> {
		const url = `${ISKRA_API_BASE_URL}/ai/qwen/stream`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this._token}`
			},
			body: JSON.stringify({ ...request, stream: true })
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return response.body!;
	}

	async claudeStream(request: IskraAIRequest): Promise<ReadableStream> {
		const url = `${ISKRA_API_BASE_URL}/ai/claude/stream`;
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this._token}`
			},
			body: JSON.stringify({ ...request, stream: true })
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		return response.body!;
	}

	// Billing methods
	async createPayment(tier: 'pro' | 'pro_plus', returnUrl: string): Promise<IskraPaymentResponse> {
		return this.request<IskraPaymentResponse>('/billing/create', {
			method: 'POST',
			body: JSON.stringify({ tier, returnUrl })
		});
	}

	async checkPaymentStatus(paymentId: string): Promise<any> {
		return this.request(`/billing/status/${paymentId}`, {
			method: 'GET'
		});
	}

	// Models methods
	async getQwenModels(): Promise<string[]> {
		const response = await this.request<{ models: string[] }>('/ai/models/qwen', {
			method: 'GET'
		});
		return response.models;
	}

	async getClaudeModels(): Promise<string[]> {
		const response = await this.request<{ models: string[] }>('/ai/models/claude', {
			method: 'GET'
		});
		return response.models;
	}

	private async generateDeviceId(): Promise<string> {
		try {
			// Используем встроенную функцию VS Code для получения уникального ID устройства
			const { getMachineId } = await import('../../../../base/node/id.js');
			const machineId = await getMachineId((err) => console.error('[IskraApiService] getMachineId error:', err));
			return machineId;
		} catch (err) {
			console.error('[IskraApiService] Failed to get machine ID:', err);
			// Fallback на случайный ID (только если не удалось получить реальный)
			return `device-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
		}
	}
}

registerSingleton(IIskraApiService, IskraApiService, InstantiationType.Eager);
