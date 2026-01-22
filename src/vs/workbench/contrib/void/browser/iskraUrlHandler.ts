/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IOpenURLOptions, IURLHandler, IURLService } from '../../../../platform/url/common/url.js';
import { IWorkbenchContribution } from '../../../common/contributions.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

/**
 * Обработчик URL для Iskra API (оплата, авторизация и т.д.)
 * Обрабатывает URL вида: vscode://iskra-ai/payment-success
 */
export class IskraUrlHandler extends Disposable implements IWorkbenchContribution, IURLHandler {

	constructor(
		@IURLService urlService: IURLService,
		@INotificationService private readonly notificationService: INotificationService,
		@IStorageService private readonly storageService: IStorageService,
	) {
		super();
		this._register(urlService.registerHandler(this));
	}

	async handleURL(uri: URI, options?: IOpenURLOptions): Promise<boolean> {
		// Проверяем что это URL для Iskra
		if (uri.authority !== 'iskra-ai') {
			return false;
		}

		console.log('[IskraUrlHandler] Handling URL:', uri.toString());

		// Обрабатываем разные пути
		const path = uri.path;

		if (path === '/payment-success') {
			return this.handlePaymentSuccess(uri);
		}

		if (path === '/payment-canceled') {
			return this.handlePaymentCanceled(uri);
		}

		if (path === '/auth-success') {
			return this.handleAuthSuccess(uri);
		}

		console.log('[IskraUrlHandler] Unknown path:', path);
		return false;
	}

	private async handlePaymentSuccess(uri: URI): Promise<boolean> {
		console.log('[IskraUrlHandler] Payment success!');

		// Показываем уведомление
		this.notificationService.notify({
			severity: Severity.Info,
			message: '✅ Оплата успешна! Подписка активирована.',
			source: 'Искра'
		});

		// Устанавливаем флаг для обновления данных
		this.storageService.store('iskra.payment.success', Date.now().toString(), StorageScope.APPLICATION, StorageTarget.MACHINE);

		// Отправляем событие для обновления UI
		window.dispatchEvent(new CustomEvent('iskra-payment-success', {
			detail: { timestamp: Date.now() }
		}));

		return true;
	}

	private async handlePaymentCanceled(uri: URI): Promise<boolean> {
		console.log('[IskraUrlHandler] Payment canceled');

		this.notificationService.notify({
			severity: Severity.Warning,
			message: 'Платёж отменён',
			source: 'Искра'
		});

		return true;
	}

	private async handleAuthSuccess(uri: URI): Promise<boolean> {
		console.log('[IskraUrlHandler] Auth success');

		// Можно использовать для OAuth авторизации в будущем
		this.notificationService.notify({
			severity: Severity.Info,
			message: 'Авторизация успешна',
			source: 'Искра'
		});

		return true;
	}
}
