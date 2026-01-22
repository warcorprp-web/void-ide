/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStatusbarService, StatusbarAlignment, IStatusbarEntryAccessor } from '../../../services/statusbar/browser/statusbar.js';
import { IWorkbenchContribution, registerWorkbenchContribution2, WorkbenchPhase } from '../../../common/contributions.js';

interface IskraUser {
	id: number;
	email: string;
	tier: 'free' | 'pro' | 'pro_plus';
	requestsUsed?: number;
	requestsTotal?: number;
}

export class CreditsStatusBarContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.creditsStatusBar';

	private entryAccessor: IStatusbarEntryAccessor | undefined;
	private updateInterval: any;

	constructor(
		@IStatusbarService private readonly statusbarService: IStatusbarService
	) {
		super();

		// Initial update
		this.updateStatusBar();
		
		// Fetch fresh data from server on startup
		this.fetchUserDataFromServer();

		// Check localStorage every second for updates (data is updated after each request)
		this.updateInterval = setInterval(() => {
			this.updateStatusBar();
		}, 1000);
		
		// Fetch from server every 3 minutes as backup
		setInterval(() => {
			this.fetchUserDataFromServer();
		}, 180000);
	}

	private async fetchUserDataFromServer(): Promise<void> {
		try {
			const token = typeof localStorage !== 'undefined' ? localStorage.getItem('iskra.auth.token') : null;
			if (!token) {
				return;
			}

			const response = await fetch('https://cli.cryptocatslab.ru/auth/me', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const data = await response.json();
				
				// Get current user data
				const userJson = typeof localStorage !== 'undefined' ? localStorage.getItem('iskra.auth.user') : null;
				if (userJson) {
					const userData = JSON.parse(userJson);
					
					// Update with fresh data from server
					const updatedUser = {
						...userData,
						...data.user,
						requestsUsed: data.usage?.requestsToday || 0,
						requestsTotal: data.usage?.limit || 20
					};
					
					if (typeof localStorage !== 'undefined') {
						localStorage.setItem('iskra.auth.user', JSON.stringify(updatedUser));
					}
					
					// Update status bar immediately
					this.updateStatusBar();
				}
			}
		} catch (e) {
			console.error('[CreditsStatusBar] Failed to fetch user data from server:', e);
		}
	}

	private getUserData(): IskraUser | null {
		try {
			// Try to get from localStorage first (browser context)
			if (typeof localStorage !== 'undefined') {
				const userJson = localStorage.getItem('iskra.auth.user');
				if (userJson) {
					return JSON.parse(userJson);
				}
			}
		} catch (e) {
			console.error('[CreditsStatusBar] Failed to get user data:', e);
		}
		return null;
	}

	private updateStatusBar(): void {
		const user = this.getUserData();
		
		if (!user) {
			// User not logged in - hide status bar
			if (this.entryAccessor) {
				this.entryAccessor.dispose();
				this.entryAccessor = undefined;
			}
			return;
		}

		// Get tier limits
		const tierLimits = {
			free: 20,
			pro: 500,
			pro_plus: 2000
		};

		const requestsUsed = user.requestsUsed ?? 0;
		const requestsTotal = user.requestsTotal ?? tierLimits[user.tier];
		const remaining = requestsTotal - requestsUsed;

		const entry = {
			name: 'Запросы Искра',
			text: `$(sparkle) Осталось запросов: ${remaining}/${requestsTotal}`,
			tooltip: `Использовано запросов сегодня: ${requestsUsed} из ${requestsTotal}\nОсталось: ${remaining}\nТариф: ${user.tier}\nНажмите, чтобы открыть настройки`,
			command: 'workbench.action.openVoidSettings',
			ariaLabel: `Осталось запросов: ${remaining} из ${requestsTotal}`,
			backgroundColor: undefined,
			color: remaining === 0 ? '#ff0000' : '#ff6600' // Red if no requests left
		};

		if (!this.entryAccessor) {
			// Add entry to the right side of the status bar with medium priority
			this.entryAccessor = this.statusbarService.addEntry(
				entry,
				'status.iskra.requests',
				StatusbarAlignment.RIGHT,
				100 // Medium priority
			);
		} else {
			this.entryAccessor.update(entry);
		}
	}

	override dispose(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}
		this.entryAccessor?.dispose();
		super.dispose();
	}
}

registerWorkbenchContribution2(CreditsStatusBarContribution.ID, CreditsStatusBarContribution, WorkbenchPhase.BlockRestore);
