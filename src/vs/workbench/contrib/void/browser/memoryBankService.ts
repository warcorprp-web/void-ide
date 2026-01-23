/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { MemoryBank, MemoryEntry, MemoryEntryType } from '../common/voidSettingsTypes.js';
import { VSBuffer } from '../../../../base/common/buffer.js';

export const IMemoryBankService = createDecorator<IMemoryBankService>('memoryBankService');

export interface IMemoryBankService {
	readonly _serviceBrand: undefined;
	
	addEntry(type: MemoryEntryType, content: string, context?: string): Promise<void>;
	getEntries(): Promise<MemoryEntry[]>;
	deleteEntry(id: string): Promise<void>;
	getMemoryAsString(): Promise<string>;
}

export class MemoryBankService implements IMemoryBankService {
	readonly _serviceBrand: undefined;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
	) {}

	private async getMemoryFilePath() {
		const workspace = this.workspaceContextService.getWorkspace();
		if (!workspace || workspace.folders.length === 0) {
			return null;
		}
		
		const workspaceFolder = workspace.folders[0].uri;
		return workspaceFolder.with({ path: `${workspaceFolder.path}/.iskra/memory.json` });
	}

	private async readMemoryFile(): Promise<MemoryBank> {
		const memoryUri = await this.getMemoryFilePath();
		if (!memoryUri) {
			return { entries: [] };
		}

		try {
			const content = await this.fileService.readFile(memoryUri);
			return JSON.parse(content.value.toString());
		} catch {
			return { entries: [] };
		}
	}

	private async writeMemoryFile(memory: MemoryBank): Promise<void> {
		const memoryUri = await this.getMemoryFilePath();
		if (!memoryUri) {
			return;
		}

		// Ensure .iskra directory exists
		const iskraDir = memoryUri.with({ path: memoryUri.path.replace('/memory.json', '') });
		try {
			await this.fileService.createFolder(iskraDir);
		} catch {
			// Directory might already exist
		}

		const content = JSON.stringify(memory, null, 2);
		await this.fileService.writeFile(memoryUri, VSBuffer.fromString(content));
	}

	async addEntry(type: MemoryEntryType, content: string, context?: string): Promise<void> {
		const memory = await this.readMemoryFile();
		
		const entry: MemoryEntry = {
			id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			type,
			content,
			timestamp: Date.now(),
			context,
		};

		memory.entries.push(entry);
		await this.writeMemoryFile(memory);
	}

	async getEntries(): Promise<MemoryEntry[]> {
		const memory = await this.readMemoryFile();
		return memory.entries;
	}

	async deleteEntry(id: string): Promise<void> {
		const memory = await this.readMemoryFile();
		memory.entries = memory.entries.filter(e => e.id !== id);
		await this.writeMemoryFile(memory);
	}

	async getMemoryAsString(): Promise<string> {
		const entries = await this.getEntries();
		
		if (entries.length === 0) {
			return '';
		}

		const grouped: Record<MemoryEntryType, MemoryEntry[]> = {
			preference: [],
			decision: [],
			solution: [],
			pattern: [],
		};

		entries.forEach(entry => {
			grouped[entry.type].push(entry);
		});

		const sections: string[] = [];

		if (grouped.preference.length > 0) {
			sections.push('User Preferences:\n' + grouped.preference.map(e => `- ${e.content}`).join('\n'));
		}

		if (grouped.decision.length > 0) {
			sections.push('Architectural Decisions:\n' + grouped.decision.map(e => `- ${e.content}`).join('\n'));
		}

		if (grouped.solution.length > 0) {
			sections.push('Known Solutions:\n' + grouped.solution.map(e => `- ${e.content}${e.context ? ` (${e.context})` : ''}`).join('\n'));
		}

		if (grouped.pattern.length > 0) {
			sections.push('Code Patterns:\n' + grouped.pattern.map(e => `- ${e.content}`).join('\n'));
		}

		return sections.join('\n\n');
	}
}
