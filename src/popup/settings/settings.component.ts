import Swal from 'sweetalert2/src/sweetalert2.js';

import {
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { DeviceType } from 'jslib-common/enums/deviceType';

import { ConstantsService } from 'jslib-common/services/constants.service';

import { CryptoService } from 'jslib-common/abstractions/crypto.service';
import { EnvironmentService } from 'jslib-common/abstractions/environment.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { UserService } from 'jslib-common/abstractions/user.service';
import { VaultTimeoutService } from 'jslib-common/abstractions/vaultTimeout.service';
import { PopupUtilsService } from '../services/popup-utils.service';

const RateUrls = {
    [DeviceType.ChromeExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.FirefoxExtension]:
        'https://addons.mozilla.org/en-US/firefox/addon/bitwarden-password-manager/#reviews',
    [DeviceType.OperaExtension]:
        'https://addons.opera.com/en/extensions/details/bitwarden-free-password-manager/#feedback-container',
    [DeviceType.EdgeExtension]:
        'https://microsoftedge.microsoft.com/addons/detail/jbkfoedolllekgbhcbcoahefnbanhhlh',
    [DeviceType.VivaldiExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.SafariExtension]:
        'https://apps.apple.com/app/bitwarden/id1352778147',
};

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent implements OnInit {
    @ViewChild('vaultTimeoutSelect', { read: ElementRef, static: true }) vaultTimeoutSelectRef: ElementRef;
    @ViewChild('vaultTimeoutActionSelect', { read: ElementRef, static: true }) vaultTimeoutActionSelectRef: ElementRef;
    vaultTimeouts: any[];
    vaultTimeout: number = null;
    vaultTimeoutActions: any[];
    vaultTimeoutAction: string;
    pin: boolean = null;
    supportsBiometric: boolean;
    biometric: boolean = false;
    previousVaultTimeout: number = null;

    constructor(private platformUtilsService: PlatformUtilsService, private i18nService: I18nService,
        private vaultTimeoutService: VaultTimeoutService, private storageService: StorageService,
        public messagingService: MessagingService, private router: Router,
        private environmentService: EnvironmentService, private cryptoService: CryptoService,
        private userService: UserService, private popupUtilsService: PopupUtilsService) {
    }

    async ngOnInit() {
        const showOnLocked = !this.platformUtilsService.isFirefox() && !this.platformUtilsService.isSafari();

        this.vaultTimeouts = [
            { name: this.i18nService.t('immediately'), value: 0 },
            { name: this.i18nService.t('oneMinute'), value: 1 },
            { name: this.i18nService.t('fiveMinutes'), value: 5 },
            { name: this.i18nService.t('fifteenMinutes'), value: 15 },
            { name: this.i18nService.t('thirtyMinutes'), value: 30 },
            { name: this.i18nService.t('oneHour'), value: 60 },
            { name: this.i18nService.t('fourHours'), value: 240 },
            { name: this.i18nService.t('eightHours'), value: 480 },
            { name: this.i18nService.t('twelveHours'), value: 960 },
            { name: this.i18nService.t('twentyFourHours'), value: 1920 },
            // { name: i18nService.t('onIdle'), value: -4 },
            // { name: i18nService.t('onSleep'), value: -3 },
        ];

        if (showOnLocked) {
            this.vaultTimeouts.push({ name: this.i18nService.t('onLocked'), value: -2 });
        }

        this.vaultTimeouts.push({ name: this.i18nService.t('onRestart'), value: -1 });
        this.vaultTimeouts.push({ name: this.i18nService.t('never'), value: null });

        this.vaultTimeoutActions = [
            { name: this.i18nService.t('lock'), value: 'lock' },
            { name: this.i18nService.t('logOut'), value: 'logOut' },
        ];

        let timeout = await this.storageService.get<number>(ConstantsService.vaultTimeoutKey);
        if (timeout != null) {
            if (timeout === -2 && !showOnLocked) {
                timeout = -1;
            }
            this.vaultTimeout = timeout;
        }
        this.previousVaultTimeout = this.vaultTimeout;
        const action = await this.storageService.get<string>(ConstantsService.vaultTimeoutActionKey);
        this.vaultTimeoutAction = action == null ? 'lock' : action;

        const pinSet = await this.vaultTimeoutService.isPinLockSet();
        this.pin = pinSet[0] || pinSet[1];

        this.supportsBiometric = await this.platformUtilsService.supportsBiometric();
        this.biometric = await this.vaultTimeoutService.isBiometricLockSet();
    }

    async saveVaultTimeout(newValue: number) {
        if (newValue == null) {
            const confirmed = await this.platformUtilsService.showDialog(
                this.i18nService.t('neverLockWarning'), null,
                this.i18nService.t('yes'), this.i18nService.t('cancel'), 'warning');
            if (!confirmed) {
                this.vaultTimeouts.forEach((option: any, i) => {
                    if (option.value === this.vaultTimeout) {
                        this.vaultTimeoutSelectRef.nativeElement.value = i + ': ' + this.vaultTimeout;
                    }
                });
                return;
            }
        }
        this.previousVaultTimeout = this.vaultTimeout;
        this.vaultTimeout = newValue;
        await this.vaultTimeoutService.setVaultTimeoutOptions(this.vaultTimeout != null ? this.vaultTimeout : null,
            this.vaultTimeoutAction);
        if (this.previousVaultTimeout == null) {
            this.messagingService.send('bgReseedStorage');
        }
    }

    async saveVaultTimeoutAction(newValue: string) {
        if (newValue === 'logOut') {
            const confirmed = await this.platformUtilsService.showDialog(
                this.i18nService.t('vaultTimeoutLogOutConfirmation'),
                this.i18nService.t('vaultTimeoutLogOutConfirmationTitle'),
                this.i18nService.t('yes'), this.i18nService.t('cancel'), 'warning');
            if (!confirmed) {
                this.vaultTimeoutActions.forEach((option: any, i) => {
                    if (option.value === this.vaultTimeoutAction) {
                        this.vaultTimeoutActionSelectRef.nativeElement.value = i + ': ' + this.vaultTimeoutAction;
                    }
                });
                return;
            }
        }
        this.vaultTimeoutAction = newValue;
        await this.vaultTimeoutService.setVaultTimeoutOptions(this.vaultTimeout != null ? this.vaultTimeout : null,
            this.vaultTimeoutAction);
    }

    async updatePin() {
        if (this.pin) {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.className = 'checkbox';
            const checkboxText = document.createElement('span');
            const restartText = document.createTextNode(this.i18nService.t('lockWithMasterPassOnRestart'));
            checkboxText.appendChild(restartText);
            label.innerHTML = '<input type="checkbox" id="master-pass-restart" checked>';
            label.appendChild(checkboxText);

            div.innerHTML =
                `<div class="swal2-text">${this.i18nService.t('setYourPinCode')}</div>` +
                '<input type="text" class="swal2-input" id="pin-val" autocomplete="off" ' +
                'autocapitalize="none" autocorrect="none" spellcheck="false" inputmode="verbatim">';

            (div.querySelector('#pin-val') as HTMLInputElement).placeholder = this.i18nService.t('pin');
            div.appendChild(label);

            const submitted = await Swal.fire({
                heightAuto: false,
                buttonsStyling: false,
                html: div,
                showCancelButton: true,
                cancelButtonText: this.i18nService.t('cancel'),
                showConfirmButton: true,
                confirmButtonText: this.i18nService.t('submit'),
            });

            let pin: string = null;
            let masterPassOnRestart: boolean = null;
            if (submitted.value) {
                pin = (document.getElementById('pin-val') as HTMLInputElement).value;
                masterPassOnRestart = (document.getElementById('master-pass-restart') as HTMLInputElement).checked;
            }
            if (pin != null && pin.trim() !== '') {
                const kdf = await this.userService.getKdf();
                const kdfIterations = await this.userService.getKdfIterations();
                const email = await this.userService.getEmail();
                const pinKey = await this.cryptoService.makePinKey(pin, email, kdf, kdfIterations);
                const key = await this.cryptoService.getKey();
                const pinProtectedKey = await this.cryptoService.encrypt(key.key, pinKey);
                if (masterPassOnRestart) {
                    const encPin = await this.cryptoService.encrypt(pin);
                    await this.storageService.save(ConstantsService.protectedPin, encPin.encryptedString);
                    this.vaultTimeoutService.pinProtectedKey = pinProtectedKey;
                } else {
                    await this.storageService.save(ConstantsService.pinProtectedKey, pinProtectedKey.encryptedString);
                }
            } else {
                this.pin = false;
            }
        }
        if (!this.pin) {
            await this.cryptoService.clearPinProtectedKey();
            await this.vaultTimeoutService.clear();
        }
    }

    async updateBiometric() {
        if (this.biometric && this.supportsBiometric) {

            let granted;
            try {
                granted = await BrowserApi.requestPermission({ permissions: ['nativeMessaging'] });
            } catch (e) {
                // tslint:disable-next-line
                console.error(e);

                if (this.platformUtilsService.isFirefox() && this.popupUtilsService.inSidebar(window)) {
                    await this.platformUtilsService.showDialog(
                        this.i18nService.t('nativeMessaginPermissionSidebarDesc'), this.i18nService.t('nativeMessaginPermissionSidebarTitle'),
                        this.i18nService.t('ok'), null);
                    this.biometric = false;
                    return;
                }
            }

            if (!granted) {
                await this.platformUtilsService.showDialog(
                    this.i18nService.t('nativeMessaginPermissionErrorDesc'), this.i18nService.t('nativeMessaginPermissionErrorTitle'),
                    this.i18nService.t('ok'), null);
                this.biometric = false;
                return;
            }

            const submitted = Swal.fire({
                heightAuto: false,
                buttonsStyling: false,
                titleText: this.i18nService.t('awaitDesktop'),
                text: this.i18nService.t('awaitDesktopDesc'),
                icon: 'info',
                iconHtml: '<i class="swal-custom-icon fa fa-info-circle text-info"></i>',
                showCancelButton: true,
                cancelButtonText: this.i18nService.t('cancel'),
                showConfirmButton: false,
                allowOutsideClick: false,
            });

            await this.storageService.save(ConstantsService.biometricAwaitingAcceptance, true);
            await this.cryptoService.toggleKey();

            await Promise.race([
                submitted.then(result => {
                    if (result.dismiss === Swal.DismissReason.cancel) {
                        this.biometric = false;
                        this.storageService.remove(ConstantsService.biometricAwaitingAcceptance);
                    }
                }),
                this.platformUtilsService.authenticateBiometric().then(result => {
                    this.biometric = result;

                    Swal.close();
                    if (this.biometric === false) {
                        this.platformUtilsService.showToast('error', this.i18nService.t('errorEnableBiometricTitle'), this.i18nService.t('errorEnableBiometricDesc'));
                    }
                }).catch(e => {
                    // Handle connection errors
                    this.biometric = false;
                }),
            ]);
        } else {
            await this.storageService.remove(ConstantsService.biometricUnlockKey);
            this.vaultTimeoutService.biometricLocked = false;
        }
    }

    async lock() {
        await this.vaultTimeoutService.lock(true);
    }

    async logOut() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('logOutConfirmation'), this.i18nService.t('logOut'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            this.messagingService.send('logout');
        }
    }

    async changePassword() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('changeMasterPasswordConfirmation'), this.i18nService.t('changeMasterPassword'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/change-your-master-password/');
        }
    }

    async twoStep() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('twoStepLoginConfirmation'), this.i18nService.t('twoStepLogin'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/setup-two-step-login/');
        }
    }

    async share() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('learnOrgConfirmation'), this.i18nService.t('learnOrg'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/what-is-an-organization/');
        }
    }

    async webVault() {
        let url = this.environmentService.getWebVaultUrl();
        if (url == null) {
            url = 'https://vault.bitwarden.com';
        }
        BrowserApi.createNewTab(url);
    }

    import() {
        BrowserApi.createNewTab('https://help.bitwarden.com/article/import-data/');
    }

    export() {
        this.router.navigate(['/export']);
    }

    help() {
        BrowserApi.createNewTab('https://help.bitwarden.com/');
    }

    about() {
        const year = (new Date()).getFullYear();
        const versionText = document.createTextNode(
            this.i18nService.t('version') + ': ' + BrowserApi.getApplicationVersion());
        const div = document.createElement('div');
        div.innerHTML = `<p class="text-center"><i class="fa fa-shield fa-3x" aria-hidden="true"></i></p>
            <p class="text-center"><b>Bitwarden</b><br>&copy; Bitwarden Inc. 2015-` + year + `</p>`;
        div.appendChild(versionText);

        Swal.fire({
            heightAuto: false,
            buttonsStyling: false,
            html: div,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: this.i18nService.t('close'),
        });
    }

    async fingerprint() {
        const fingerprint = await this.cryptoService.getFingerprint(await this.userService.getUserId());
        const p = document.createElement('p');
        p.innerText = this.i18nService.t('yourAccountsFingerprint') + ':';
        const p2 = document.createElement('p');
        p2.innerText = fingerprint.join('-');
        const div = document.createElement('div');
        div.appendChild(p);
        div.appendChild(p2);

        const result = await Swal.fire({
            heightAuto: false,
            buttonsStyling: false,
            html: div,
            showCancelButton: true,
            cancelButtonText: this.i18nService.t('close'),
            showConfirmButton: true,
            confirmButtonText: this.i18nService.t('learnMore'),
        });

        if (result.value) {
            this.platformUtilsService.launchUri('https://help.bitwarden.com/article/fingerprint-phrase/');
        }
    }

    rate() {
        const deviceType = this.platformUtilsService.getDevice();
        BrowserApi.createNewTab((RateUrls as any)[deviceType]);
    }
}
