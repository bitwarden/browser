import { BrowserApi } from '../browser/browserApi';

import MainBackground from './main.background';

import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { EventService } from 'jslib-common/abstractions/event.service';
import { PasswordGenerationService } from 'jslib-common/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { TotpService } from 'jslib-common/abstractions/totp.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';

import { EventType } from 'jslib-common/enums/eventType';

export default class ContextMenusBackground {
    private contextMenus: any;

    constructor(private main: MainBackground, private cipherService: CipherService,
        private passwordGenerationService: PasswordGenerationService,
        private platformUtilsService: PlatformUtilsService, private vaultTimeoutService: VaultTimeoutService,
        private eventService: EventService, private totpService: TotpService) {
        this.contextMenus = chrome.contextMenus;
    }

    async init() {
        if (!this.contextMenus) {
            return;
        }

        this.contextMenus.onClicked.addListener(async (info: any, tab: any) => {
            if (info.menuItemId === 'generate-password') {
                await this.generatePasswordToClipboard();
            } else if (info.menuItemId.startsWith('autofill_') ||
                info.parentMenuItemId === 'copy-username' ||
                info.parentMenuItemId === 'copy-password' ||
                info.parentMenuItemId === 'copy-totp') {
                await this.cipherAction(info);
            }
        });
    }

    private async generatePasswordToClipboard() {
        const options = (await this.passwordGenerationService.getOptions())[0];
        const password = await this.passwordGenerationService.generatePassword(options);
        this.platformUtilsService.copyToClipboard(password, { window: window });
        this.passwordGenerationService.addHistory(password);
    }

    private async cipherAction(info: any) {
        const id = info.menuItemId.split('_')[1];
        if (id === 'noop') {
            if (chrome.browserAction && (chrome.browserAction as any).openPopup) {
                (chrome.browserAction as any).openPopup();
            }
            return;
        }

        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        const ciphers = await this.cipherService.getAllDecrypted();
        const cipher = ciphers.find(c => c.id === id);
        if (cipher == null) {
            return;
        }

        if (info.menuItemId.startsWith("autofill_")) {
            await this.startAutofillPage(cipher);
        } else if (info.parentMenuItemId === 'copy-username') {
            this.platformUtilsService.copyToClipboard(cipher.login.username, { window: window });
        } else if (info.parentMenuItemId === 'copy-password') {
            this.platformUtilsService.copyToClipboard(cipher.login.password, { window: window });
            this.eventService.collect(EventType.Cipher_ClientCopiedPassword, cipher.id);
        } else if (info.parentMenuItemId === 'copy-totp') {
            const totpValue = await this.totpService.getCode(cipher.login.totp);
            this.platformUtilsService.copyToClipboard(totpValue, { window: window });
        }
    }

    private async startAutofillPage(cipher: any) {
        this.main.loginToAutoFill = cipher;
        const tab = await BrowserApi.getTabFromCurrentWindow();
        if (tab == null) {
            return;
        }

        BrowserApi.tabSendMessage(tab, {
            command: 'collectPageDetails',
            tab: tab,
            sender: 'contextMenu',
        });
    }
}
