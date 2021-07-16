import { CipherType } from 'jslib-common/enums';
import { CipherRepromptType } from 'jslib-common/enums/cipherRepromptType';

import {
    ApiService,
    AppIdService,
    AuditService,
    AuthService,
    CipherService,
    CollectionService,
    ConstantsService,
    ContainerService,
    EnvironmentService,
    FolderService,
    PasswordGenerationService,
    SettingsService,
    StateService,
    SyncService,
    TokenService,
    TotpService,
    UserService,
} from 'jslib-common/services';
import { ConsoleLogService } from 'jslib-common/services/consoleLog.service';
import { EventService } from 'jslib-common/services/event.service';
import { ExportService } from 'jslib-common/services/export.service';
import { FileUploadService } from 'jslib-common/services/fileUpload.service';
import { NotificationsService } from 'jslib-common/services/notifications.service';
import { PolicyService } from 'jslib-common/services/policy.service';
import { SearchService } from 'jslib-common/services/search.service';
import { SendService } from 'jslib-common/services/send.service';
import { SystemService } from 'jslib-common/services/system.service';
import { WebCryptoFunctionService } from 'jslib-common/services/webCryptoFunction.service';

import {
    ApiService as ApiServiceAbstraction,
    AppIdService as AppIdServiceAbstraction,
    AuditService as AuditServiceAbstraction,
    AuthService as AuthServiceAbstraction,
    CipherService as CipherServiceAbstraction,
    CollectionService as CollectionServiceAbstraction,
    CryptoService as CryptoServiceAbstraction,
    EnvironmentService as EnvironmentServiceAbstraction,
    FolderService as FolderServiceAbstraction,
    I18nService as I18nServiceAbstraction,
    MessagingService as MessagingServiceAbstraction,
    PasswordGenerationService as PasswordGenerationServiceAbstraction,
    PlatformUtilsService as PlatformUtilsServiceAbstraction,
    SettingsService as SettingsServiceAbstraction,
    StateService as StateServiceAbstraction,
    StorageService as StorageServiceAbstraction,
    SyncService as SyncServiceAbstraction,
    TokenService as TokenServiceAbstraction,
    TotpService as TotpServiceAbstraction,
    UserService as UserServiceAbstraction,
    VaultTimeoutService as VaultTimeoutServiceAbstraction,
} from 'jslib-common/abstractions';
import { CryptoFunctionService as CryptoFunctionServiceAbstraction } from 'jslib-common/abstractions/cryptoFunction.service';
import { EventService as EventServiceAbstraction } from 'jslib-common/abstractions/event.service';
import { ExportService as ExportServiceAbstraction } from 'jslib-common/abstractions/export.service';
import { FileUploadService as FileUploadServiceAbstraction } from 'jslib-common/abstractions/fileUpload.service';
import { NotificationsService as NotificationsServiceAbstraction } from 'jslib-common/abstractions/notifications.service';
import { PolicyService as PolicyServiceAbstraction } from 'jslib-common/abstractions/policy.service';
import { SearchService as SearchServiceAbstraction } from 'jslib-common/abstractions/search.service';
import { SendService as SendServiceAbstraction } from 'jslib-common/abstractions/send.service';
import { SystemService as SystemServiceAbstraction } from 'jslib-common/abstractions/system.service';
import { AutofillService as AutofillServiceAbstraction } from '../services/abstractions/autofill.service';

import { Utils } from 'jslib-common/misc/utils';

import { BrowserApi } from '../browser/browserApi';
import { SafariApp } from '../browser/safariApp';

import CommandsBackground from './commands.background';
import ContextMenusBackground from './contextMenus.background';
import IdleBackground from './idle.background';
import { NativeMessagingBackground } from './nativeMessaging.background';
import RuntimeBackground from './runtime.background';
import TabsBackground from './tabs.background';
import WebRequestBackground from './webRequest.background';
import WindowsBackground from './windows.background';

import { PopupUtilsService } from '../popup/services/popup-utils.service';
import AutofillService from '../services/autofill.service';
import { BrowserCryptoService } from '../services/browserCrypto.service';
import BrowserMessagingService from '../services/browserMessaging.service';
import BrowserPlatformUtilsService from '../services/browserPlatformUtils.service';
import BrowserStorageService from '../services/browserStorage.service';
import I18nService from '../services/i18n.service';
import VaultTimeoutService from '../services/vaultTimeout.service';

export default class MainBackground {
    messagingService: MessagingServiceAbstraction;
    storageService: StorageServiceAbstraction;
    secureStorageService: StorageServiceAbstraction;
    i18nService: I18nServiceAbstraction;
    platformUtilsService: PlatformUtilsServiceAbstraction;
    constantsService: ConstantsService;
    consoleLogService: ConsoleLogService;
    cryptoService: CryptoServiceAbstraction;
    cryptoFunctionService: CryptoFunctionServiceAbstraction;
    tokenService: TokenServiceAbstraction;
    appIdService: AppIdServiceAbstraction;
    apiService: ApiServiceAbstraction;
    environmentService: EnvironmentServiceAbstraction;
    userService: UserServiceAbstraction;
    settingsService: SettingsServiceAbstraction;
    cipherService: CipherServiceAbstraction;
    folderService: FolderServiceAbstraction;
    collectionService: CollectionServiceAbstraction;
    vaultTimeoutService: VaultTimeoutServiceAbstraction;
    syncService: SyncServiceAbstraction;
    passwordGenerationService: PasswordGenerationServiceAbstraction;
    totpService: TotpServiceAbstraction;
    autofillService: AutofillServiceAbstraction;
    containerService: ContainerService;
    auditService: AuditServiceAbstraction;
    authService: AuthServiceAbstraction;
    exportService: ExportServiceAbstraction;
    searchService: SearchServiceAbstraction;
    notificationsService: NotificationsServiceAbstraction;
    stateService: StateServiceAbstraction;
    systemService: SystemServiceAbstraction;
    eventService: EventServiceAbstraction;
    policyService: PolicyServiceAbstraction;
    popupUtilsService: PopupUtilsService;
    sendService: SendServiceAbstraction;
    fileUploadService: FileUploadServiceAbstraction;

    onUpdatedRan: boolean;
    onReplacedRan: boolean;
    loginToAutoFill: any = null;
    notificationQueue: any[] = [];

    private commandsBackground: CommandsBackground;
    private contextMenusBackground: ContextMenusBackground;
    private idleBackground: IdleBackground;
    private runtimeBackground: RuntimeBackground;
    private tabsBackground: TabsBackground;
    private webRequestBackground: WebRequestBackground;
    private windowsBackground: WindowsBackground;

    private sidebarAction: any;
    private buildingContextMenu: boolean;
    private menuOptionsLoaded: any[] = [];
    private syncTimeout: any;
    private isSafari: boolean;
    private nativeMessagingBackground: NativeMessagingBackground;

    constructor() {
        // Services
        this.messagingService = new BrowserMessagingService();
        this.platformUtilsService = new BrowserPlatformUtilsService(this.messagingService,
            (clipboardValue, clearMs) => {
                if (this.systemService != null) {
                    this.systemService.clearClipboard(clipboardValue, clearMs);
                }
            },
            async () => {
                if (this.nativeMessagingBackground != null) {
                    const promise = this.nativeMessagingBackground.getResponse();

                    try {
                        await this.nativeMessagingBackground.send({ command: 'biometricUnlock' });
                    } catch (e) {
                        return Promise.reject(e);
                    }

                    return promise.then(result => result.response === 'unlocked');
                }
            });
        this.storageService = new BrowserStorageService();
        this.secureStorageService = new BrowserStorageService();
        this.i18nService = new I18nService(BrowserApi.getUILanguage(window));
        this.cryptoFunctionService = new WebCryptoFunctionService(window, this.platformUtilsService);
        this.consoleLogService = new ConsoleLogService(false);
        this.cryptoService = new BrowserCryptoService(this.storageService, this.secureStorageService,
            this.cryptoFunctionService, this.platformUtilsService, this.consoleLogService);
        this.tokenService = new TokenService(this.storageService);
        this.appIdService = new AppIdService(this.storageService);
        this.apiService = new ApiService(this.tokenService, this.platformUtilsService,
            (expired: boolean) => this.logout(expired));
        this.userService = new UserService(this.tokenService, this.storageService);
        this.settingsService = new SettingsService(this.userService, this.storageService);
        this.fileUploadService = new FileUploadService(this.consoleLogService, this.apiService);
        this.cipherService = new CipherService(this.cryptoService, this.userService, this.settingsService,
            this.apiService, this.fileUploadService, this.storageService, this.i18nService, () => this.searchService);
        this.folderService = new FolderService(this.cryptoService, this.userService, this.apiService,
            this.storageService, this.i18nService, this.cipherService);
        this.collectionService = new CollectionService(this.cryptoService, this.userService, this.storageService,
            this.i18nService);
        this.searchService = new SearchService(this.cipherService, this.consoleLogService, this.i18nService);
        this.sendService = new SendService(this.cryptoService, this.userService, this.apiService, this.fileUploadService,
            this.storageService, this.i18nService, this.cryptoFunctionService);
        this.stateService = new StateService();
        this.policyService = new PolicyService(this.userService, this.storageService);
        this.vaultTimeoutService = new VaultTimeoutService(this.cipherService, this.folderService,
            this.collectionService, this.cryptoService, this.platformUtilsService, this.storageService,
            this.messagingService, this.searchService, this.userService, this.tokenService,
            async () => {
                if (this.notificationsService != null) {
                    this.notificationsService.updateConnection(false);
                }
                await this.setIcon();
                await this.refreshBadgeAndMenu(true);
                if (this.systemService != null) {
                    this.systemService.startProcessReload();
                    await this.systemService.clearPendingClipboard();
                }
            }, async () => await this.logout(false));
        this.syncService = new SyncService(this.userService, this.apiService, this.settingsService,
            this.folderService, this.cipherService, this.cryptoService, this.collectionService,
            this.storageService, this.messagingService, this.policyService, this.sendService,
            async (expired: boolean) => await this.logout(expired));
        this.eventService = new EventService(this.storageService, this.apiService, this.userService,
            this.cipherService);
        this.passwordGenerationService = new PasswordGenerationService(this.cryptoService, this.storageService,
            this.policyService);
        this.totpService = new TotpService(this.storageService, this.cryptoFunctionService);
        this.autofillService = new AutofillService(this.cipherService, this.userService, this.totpService,
            this.eventService);
        this.containerService = new ContainerService(this.cryptoService);
        this.auditService = new AuditService(this.cryptoFunctionService, this.apiService);
        this.exportService = new ExportService(this.folderService, this.cipherService, this.apiService,
            this.cryptoService);
        this.notificationsService = new NotificationsService(this.userService, this.syncService, this.appIdService,
            this.apiService, this.vaultTimeoutService, () => this.logout(true), this.consoleLogService);
        this.environmentService = new EnvironmentService(this.apiService, this.storageService,
            this.notificationsService);
        this.popupUtilsService = new PopupUtilsService(this.platformUtilsService);
        this.systemService = new SystemService(this.storageService, this.vaultTimeoutService,
            this.messagingService, this.platformUtilsService, () => {
                const forceWindowReload = this.platformUtilsService.isSafari() ||
                    this.platformUtilsService.isFirefox() || this.platformUtilsService.isOpera();
                BrowserApi.reloadExtension(forceWindowReload ? window : null);
                return Promise.resolve();
            });

        // Other fields
        this.isSafari = this.platformUtilsService.isSafari();
        this.sidebarAction = this.isSafari ? null : (typeof opr !== 'undefined') && opr.sidebarAction ?
            opr.sidebarAction : (window as any).chrome.sidebarAction;

        // Background
        this.runtimeBackground = new RuntimeBackground(this, this.autofillService, this.cipherService,
            this.platformUtilsService as BrowserPlatformUtilsService, this.storageService, this.i18nService,
            this.notificationsService, this.systemService, this.vaultTimeoutService,
            this.environmentService, this.policyService, this.userService, this.messagingService);
        this.nativeMessagingBackground = new NativeMessagingBackground(this.storageService, this.cryptoService, this.cryptoFunctionService,
            this.vaultTimeoutService, this.runtimeBackground, this.i18nService, this.userService, this.messagingService, this.appIdService,
            this.platformUtilsService);
        this.commandsBackground = new CommandsBackground(this, this.passwordGenerationService,
            this.platformUtilsService, this.vaultTimeoutService);

        this.tabsBackground = new TabsBackground(this);
        this.contextMenusBackground = new ContextMenusBackground(this, this.cipherService, this.passwordGenerationService,
            this.platformUtilsService, this.vaultTimeoutService, this.eventService, this.totpService);
        this.idleBackground = new IdleBackground(this.vaultTimeoutService, this.storageService,
            this.notificationsService);
        this.webRequestBackground = new WebRequestBackground(this.platformUtilsService, this.cipherService,
            this.vaultTimeoutService);
        this.windowsBackground = new WindowsBackground(this);

        const that = this;
        this.authService = new AuthService(this.cryptoService, this.apiService, this.userService,
            this.tokenService, this.appIdService, this.i18nService, this.platformUtilsService,
            new class extends MessagingServiceAbstraction {
                // AuthService should send the messages to the background not popup.
                send = (subscriber: string, arg: any = {}) => {
                    const message = Object.assign({}, { command: subscriber }, arg);
                    that.runtimeBackground.processMessage(message, that, null);
                }
            }(), this.vaultTimeoutService, this.consoleLogService);
    }

    async bootstrap() {
        this.containerService.attachToWindow(window);

        (this.authService as AuthService).init();
        await (this.vaultTimeoutService as VaultTimeoutService).init(true);
        await (this.i18nService as I18nService).init();
        await (this.eventService as EventService).init(true);
        await this.runtimeBackground.init();
        await this.commandsBackground.init();

        await this.tabsBackground.init();
        await this.contextMenusBackground.init();
        await this.idleBackground.init();
        await this.webRequestBackground.init();
        await this.windowsBackground.init();

        return new Promise<void>(resolve => {
            setTimeout(async () => {
                await this.environmentService.setUrlsFromStorage();
                await this.setIcon();
                this.cleanupNotificationQueue();
                this.fullSync(true);
                setTimeout(() => this.notificationsService.init(this.environmentService), 2500);
                resolve();
            }, 500);
        });
    }

    async setIcon() {
        if (!chrome.browserAction && !this.sidebarAction) {
            return;
        }

        const isAuthenticated = await this.userService.isAuthenticated();
        const locked = await this.vaultTimeoutService.isLocked();

        let suffix = '';
        if (!isAuthenticated) {
            suffix = '_gray';
        } else if (locked) {
            suffix = '_locked';
        }

        await this.actionSetIcon(chrome.browserAction, suffix);
        await this.actionSetIcon(this.sidebarAction, suffix);
    }

    async refreshBadgeAndMenu(forLocked: boolean = false) {
        if (!chrome.windows || !chrome.contextMenus) {
            return;
        }

        const menuDisabled = await this.storageService.get<boolean>(ConstantsService.disableContextMenuItemKey);
        const tab = await BrowserApi.getTabFromCurrentWindow();
        if (!menuDisabled) {
            await this.buildContextMenu(tab);
        } else {
            await this.contextMenusRemoveAll();
        }

        if (forLocked) {
            await this.loadMenuAndUpdateBadgeForNoAccessState(!menuDisabled);
            this.onUpdatedRan = this.onReplacedRan = false;
            return;
        }

    }

    async logout(expired: boolean) {
        await this.eventService.uploadEvents();
        const userId = await this.userService.getUserId();

        await Promise.all([
            this.eventService.clearEvents(),
            this.syncService.setLastSync(new Date(0)),
            this.tokenService.clearToken(),
            this.cryptoService.clearKeys(),
            this.userService.clear(),
            this.settingsService.clear(userId),
            this.cipherService.clear(userId),
            this.folderService.clear(userId),
            this.collectionService.clear(userId),
            this.policyService.clear(userId),
            this.passwordGenerationService.clear(),
            this.vaultTimeoutService.clear(),
        ]);

        this.searchService.clearIndex();
        this.messagingService.send('doneLoggingOut', { expired: expired });

        await this.setIcon();
        await this.refreshBadgeAndMenu();
        await this.reseedStorage();
        this.notificationsService.updateConnection(false);
        this.systemService.startProcessReload();
        await this.systemService.clearPendingClipboard();
    }

    async collectPageDetailsForContentScript(tab: any, sender: string, frameId: number = null) {
        if (tab == null || !tab.id) {
            return;
        }

        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        const options: any = {};
        if (frameId != null) {
            options.frameId = frameId;
        }

        BrowserApi.tabSendMessage(tab, {
            command: 'collectPageDetails',
            tab: tab,
            sender: sender,
        }, options);
    }

    async checkNotificationQueue(tab: any = null): Promise<any> {
        if (this.notificationQueue.length === 0) {
            return;
        }

        if (tab != null) {
            this.doNotificationQueueCheck(tab);
            return;
        }

        const currentTab = await BrowserApi.getTabFromCurrentWindow();
        if (currentTab != null) {
            this.doNotificationQueueCheck(currentTab);
        }
    }

    async openPopup() {
        // Chrome APIs cannot open popup

        // TODO: Do we need to open this popup?
        if (!this.isSafari) {
            return;
        }
        await SafariApp.sendMessageToApp('showPopover', null, true);
    }

    async reseedStorage() {
        if (!this.platformUtilsService.isChrome() && !this.platformUtilsService.isVivaldi() &&
            !this.platformUtilsService.isOpera()) {
            return;
        }

        const currentVaultTimeout = await this.storageService.get<number>(ConstantsService.vaultTimeoutKey);
        if (currentVaultTimeout == null) {
            return;
        }

        const getStorage = (): Promise<any> => new Promise(resolve => {
            chrome.storage.local.get(null, (o: any) => resolve(o));
        });

        const clearStorage = (): Promise<void> => new Promise(resolve => {
            chrome.storage.local.clear(() => resolve());
        });

        const storage = await getStorage();
        await clearStorage();

        for (const key in storage) {
            if (!storage.hasOwnProperty(key)) {
                continue;
            }
            await this.storageService.save(key, storage[key]);
        }
    }

    private async buildContextMenu(tab: any) {
        if (!chrome.contextMenus || this.buildingContextMenu) {
            return;
        }

        this.buildingContextMenu = true;
        await this.contextMenusRemoveAll();

        await this.contextMenusCreate({
            type: 'normal',
            id: 'root',
            contexts: ['all'],
            title: 'Bitwarden',
        });

        await this.loadMenuAndUpdateBadge(tab.url, tab.id);
        this.onUpdatedRan = this.onReplacedRan = false;

        await this.contextMenusCreate({
            type: 'separator',
            contexts: ['all'],
            parentId: 'root',
        });

        await this.contextMenusCreate({
            type: 'normal',
            id: 'copy-username',
            parentId: 'root',
            contexts: ['all'],
            title: this.i18nService.t('copyUsername'),
        });

        await this.contextMenusCreate({
            type: 'normal',
            id: 'copy-password',
            parentId: 'root',
            contexts: ['all'],
            title: this.i18nService.t('copyPassword'),
        });

        if (await this.userService.canAccessPremium()) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-totp',
                parentId: 'root',
                contexts: ['all'],
                title: this.i18nService.t('copyVerificationCode'),
            });
        }

        await this.contextMenusCreate({
            type: 'separator',
            contexts: ['all'],
            parentId: 'root',
        });

        await this.contextMenusCreate({
            type: 'normal',
            id: 'generate-password',
            parentId: 'root',
            contexts: ['all'],
            title: this.i18nService.t('generatePasswordCopied'),
        });

        this.buildingContextMenu = false;
    }

    private async loadMenuAndUpdateBadge(url: string, tabId: number) {
        if (!url || (!chrome.browserAction && !this.sidebarAction)) {
            return;
        }

        this.actionSetBadgeBackgroundColor(chrome.browserAction);
        this.actionSetBadgeBackgroundColor(this.sidebarAction);

        this.menuOptionsLoaded = [];
        const locked = await this.vaultTimeoutService.isLocked();
        if (!locked) {
            try {
                const ciphers = await this.cipherService.getAllDecryptedForUrl(url);
                ciphers.sort((a, b) => this.cipherService.sortCiphersByLastUsedThenName(a, b));

                ciphers.forEach(cipher => {
                    this.loadLoginContextMenuOptions(cipher);
                });

                const disableBadgeCounter = await this.storageService.get<boolean>(ConstantsService.disableBadgeCounterKey);
                let theText = '';

                if (!disableBadgeCounter) {
                    if (ciphers.length > 0 && ciphers.length <= 9) {
                        theText = ciphers.length.toString();
                    } else if (ciphers.length > 0) {
                        theText = '9+';
                    }
                }

                if (ciphers.length === 0) {
                    await this.loadNoLoginsContextMenuOptions(this.i18nService.t('noMatchingLogins'));
                }

                this.sidebarActionSetBadgeText(theText, tabId);
                this.browserActionSetBadgeText(theText, tabId);

                return;
            } catch { }
        }

        await this.loadMenuAndUpdateBadgeForNoAccessState(true);
    }

    private async loadMenuAndUpdateBadgeForNoAccessState(contextMenuEnabled: boolean) {
        if (contextMenuEnabled) {
            const authed = await this.userService.isAuthenticated();
            await this.loadNoLoginsContextMenuOptions(this.i18nService.t(authed ? 'vaultLocked' : 'vaultLoggedOut'));
        }

        const tabs = await BrowserApi.getActiveTabs();
        if (tabs != null) {
            tabs.forEach(tab => {
                if (tab.id != null) {
                    this.browserActionSetBadgeText('', tab.id);
                    this.sidebarActionSetBadgeText('', tab.id);
                }
            });
        }
    }

    private async loadLoginContextMenuOptions(cipher: any) {
        if (cipher == null || cipher.type !== CipherType.Login || cipher.reprompt !== CipherRepromptType.None) {
            return;
        }

        let title = cipher.name;
        if (cipher.login.username && cipher.login.username !== '') {
            title += (' (' + cipher.login.username + ')');
        }
        await this.loadContextMenuOptions(title, cipher.id, cipher);
    }

    private async loadNoLoginsContextMenuOptions(noLoginsMessage: string) {
        await this.loadContextMenuOptions(noLoginsMessage, 'noop', null);
    }

    private async loadContextMenuOptions(title: string, idSuffix: string, cipher: any) {
        if (!chrome.contextMenus || this.menuOptionsLoaded.indexOf(idSuffix) > -1 ||
            (cipher != null && cipher.type !== CipherType.Login)) {
            return;
        }

        this.menuOptionsLoaded.push(idSuffix);

        if (cipher == null || (cipher.login.password && cipher.login.password !== '')) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'autofill_' + idSuffix,
                parentId: 'root',
                contexts: ['all'],
                title: `${this.i18nService.t('autoFill')} ${this.sanitizeContextMenuTitle(title)}`,
            });
        }

        if (cipher == null || (cipher.login.username && cipher.login.username !== '')) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-username_' + idSuffix,
                parentId: 'copy-username',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }

        if (cipher == null || (cipher.login.password && cipher.login.password !== '' && cipher.viewPassword)) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-password_' + idSuffix,
                parentId: 'copy-password',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }

        const canAccessPremium = await this.userService.canAccessPremium();
        if (canAccessPremium && (cipher == null || (cipher.login.totp && cipher.login.totp !== ''))) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-totp_' + idSuffix,
                parentId: 'copy-totp',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }
    }

    private sanitizeContextMenuTitle(title: string): string {
        return title.replace(/&/g, '&&');
    }

    private cleanupNotificationQueue() {
        for (let i = this.notificationQueue.length - 1; i >= 0; i--) {
            if (this.notificationQueue[i].expires < new Date()) {
                this.notificationQueue.splice(i, 1);
            }
        }
        setTimeout(() => this.cleanupNotificationQueue(), 2 * 60 * 1000); // check every 2 minutes
    }

    private doNotificationQueueCheck(tab: any) {
        if (tab == null) {
            return;
        }

        const tabDomain = Utils.getDomain(tab.url);
        if (tabDomain == null) {
            return;
        }

        for (let i = 0; i < this.notificationQueue.length; i++) {
            if (this.notificationQueue[i].tabId !== tab.id || this.notificationQueue[i].domain !== tabDomain) {
                continue;
            }
            if (this.notificationQueue[i].type === 'addLogin') {
                BrowserApi.tabSendMessageData(tab, 'openNotificationBar', {
                    type: 'add',
                });
            } else if (this.notificationQueue[i].type === 'changePassword') {
                BrowserApi.tabSendMessageData(tab, 'openNotificationBar', {
                    type: 'change',
                });
            }
            break;
        }
    }

    private async fullSync(override: boolean = false) {
        const syncInternal = 6 * 60 * 60 * 1000; // 6 hours
        const lastSync = await this.syncService.getLastSync();

        let lastSyncAgo = syncInternal + 1;
        if (lastSync != null) {
            lastSyncAgo = new Date().getTime() - lastSync.getTime();
        }

        if (override || lastSyncAgo >= syncInternal) {
            await this.syncService.fullSync(override);
            this.scheduleNextSync();
        } else {
            this.scheduleNextSync();
        }
    }

    private scheduleNextSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(async () => await this.fullSync(), 5 * 60 * 1000); // check every 5 minutes
    }

    // Browser API Helpers

    private contextMenusRemoveAll() {
        return new Promise<void>(resolve => {
            chrome.contextMenus.removeAll(() => {
                resolve();
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        });
    }

    private contextMenusCreate(options: any) {
        return new Promise<void>(resolve => {
            chrome.contextMenus.create(options, () => {
                resolve();
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        });
    }

    private async actionSetIcon(theAction: any, suffix: string): Promise<any> {
        if (!theAction || !theAction.setIcon) {
            return;
        }

        const options = {
            path: {
                19: 'images/icon19' + suffix + '.png',
                38: 'images/icon38' + suffix + '.png',
            },
        };

        if (this.platformUtilsService.isFirefox()) {
            await theAction.setIcon(options);
        } else if (this.platformUtilsService.isSafari()) {
            // Workaround since Safari 14.0.3 returns a pending promise
            // which doesn't resolve within a reasonable time.
            theAction.setIcon(options);
        } else {
            return new Promise<void>(resolve => {
                theAction.setIcon(options, () => resolve());
            });
        }
    }

    private actionSetBadgeBackgroundColor(action: any) {
        if (action && action.setBadgeBackgroundColor) {
            action.setBadgeBackgroundColor({ color: '#294e5f' });
        }
    }

    private browserActionSetBadgeText(text: string, tabId: number) {
        if (chrome.browserAction && chrome.browserAction.setBadgeText) {
            chrome.browserAction.setBadgeText({
                text: text,
                tabId: tabId,
            });
        }
    }

    private sidebarActionSetBadgeText(text: string, tabId: number) {
        if (!this.sidebarAction) {
            return;
        }

        if (this.sidebarAction.setBadgeText) {
            this.sidebarAction.setBadgeText({
                text: text,
                tabId: tabId,
            });
        } else if (this.sidebarAction.setTitle) {
            let title = 'Bitwarden';
            if (text && text !== '') {
                title += (' [' + text + ']');
            }

            this.sidebarAction.setTitle({
                title: title,
                tabId: tabId,
            });
        }
    }
}
