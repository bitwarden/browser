import { BrowserApi } from '../browser/browserApi';

import {
    BodyOutputType,
    Toast,
    ToasterConfig,
    ToasterService,
} from 'angular2-toaster';
import Swal, { SweetAlertIcon } from 'sweetalert2/src/sweetalert2.js';

import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnInit,
    SecurityContext,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import {
    NavigationEnd,
    Router,
    RouterOutlet,
} from '@angular/router';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { AuthService } from 'jslib-common/abstractions/auth.service';
import { I18nService } from 'jslib-common/abstractions/i18n.service';
import { MessagingService } from 'jslib-common/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';

import { ConstantsService } from 'jslib-common/services/constants.service';

import BrowserPlatformUtilsService from 'src/services/browserPlatformUtils.service';
import { routerTransition } from './app-routing.animations';

@Component({
    selector: 'app-root',
    styles: [],
    animations: [routerTransition],
    template: `
        <toaster-container [toasterconfig]="toasterConfig" aria-live="polite"></toaster-container>
        <main [@routerTransition]="getState(o)">
            <router-outlet #o="outlet"></router-outlet>
        </main>`,
})
export class AppComponent implements OnInit {
    toasterConfig: ToasterConfig = new ToasterConfig({
        showCloseButton: false,
        mouseoverTimerStop: true,
        animation: 'slideUp',
        limit: 2,
        positionClass: 'toast-bottom-full-width',
        newestOnTop: false,
    });

    private lastActivity: number = null;

    constructor(private toasterService: ToasterService, private storageService: StorageService,
        private broadcasterService: BroadcasterService, private authService: AuthService,
        private i18nService: I18nService, private router: Router,
        private stateService: StateService, private messagingService: MessagingService,
        private changeDetectorRef: ChangeDetectorRef, private ngZone: NgZone,
        private sanitizer: DomSanitizer, private platformUtilsService: PlatformUtilsService) { }

    ngOnInit() {
        if (BrowserApi.getBackgroundPage() == null) {
            return;
        }

        this.ngZone.runOutsideAngular(() => {
            window.onmousemove = () => this.recordActivity();
            window.onmousedown = () => this.recordActivity();
            window.ontouchstart = () => this.recordActivity();
            window.onclick = () => this.recordActivity();
            window.onscroll = () => this.recordActivity();
            window.onkeypress = () => this.recordActivity();
        });

        (window as any).bitwardenPopupMainMessageListener = async (msg: any, sender: any, sendResponse: any) => {
            if (msg.command === 'doneLoggingOut') {
                this.ngZone.run(async () => {
                    this.authService.logOut(() => {
                        if (msg.expired) {
                            this.showToast({
                                type: 'warning',
                                title: this.i18nService.t('loggedOut'),
                                text: this.i18nService.t('loginExpired'),
                            });
                        }
                        this.router.navigate(['home']);
                        this.stateService.purge();
                    });
                    this.changeDetectorRef.detectChanges();
                });
            } else if (msg.command === 'authBlocked') {
                this.ngZone.run(() => {
                    this.router.navigate(['home']);
                });
            } else if (msg.command === 'locked') {
                this.stateService.purge();
                this.ngZone.run(() => {
                    this.router.navigate(['lock']);
                });
            } else if (msg.command === 'showDialog') {
                await this.showDialog(msg);
            } else if (msg.command === 'showPasswordDialog') {
                await this.showPasswordDialog(msg);
            } else if (msg.command === 'showToast') {
                this.ngZone.run(() => {
                    this.showToast(msg);
                });
            } else if (msg.command === 'reloadProcess') {
                const windowReload = this.platformUtilsService.isSafari() ||
                    this.platformUtilsService.isFirefox() || this.platformUtilsService.isOpera();
                if (windowReload) {
                    // Wait to make sure background has reloaded first.
                    window.setTimeout(() => BrowserApi.reloadExtension(window), 2000);
                }
            } else if (msg.command === 'reloadPopup') {
                this.ngZone.run(() => {
                    this.router.navigate(['/']);
                });
            } else {
                msg.webExtSender = sender;
                this.broadcasterService.send(msg);
            }
        };

        BrowserApi.messageListener('app.component', (window as any).bitwardenPopupMainMessageListener);

        this.router.events.subscribe(event => {
            if (event instanceof NavigationEnd) {
                const url = event.urlAfterRedirects || event.url || '';
                if (url.startsWith('/tabs/') && (window as any).previousPopupUrl != null &&
                    (window as any).previousPopupUrl.startsWith('/tabs/')) {
                    this.stateService.remove('GroupingsComponent');
                    this.stateService.remove('GroupingsComponentScope');
                    this.stateService.remove('CiphersComponent');
                    this.stateService.remove('SendGroupingsComponent');
                    this.stateService.remove('SendGroupingsComponentScope');
                    this.stateService.remove('SendTypeComponent');
                }
                if (url.startsWith('/tabs/')) {
                    this.stateService.remove('addEditCipherInfo');
                }
                (window as any).previousPopupUrl = url;

                // Clear route direction after animation (400ms)
                if ((window as any).routeDirection != null) {
                    window.setTimeout(() => {
                        (window as any).routeDirection = null;
                    }, 400);
                }
            }
        });
    }

    getState(outlet: RouterOutlet) {
        if (outlet.activatedRouteData.state === 'ciphers') {
            const routeDirection = (window as any).routeDirection != null ? (window as any).routeDirection : '';
            return 'ciphers_direction=' + routeDirection + '_' +
                (outlet.activatedRoute.queryParams as any).value.folderId + '_' +
                (outlet.activatedRoute.queryParams as any).value.collectionId;
        } else {
            return outlet.activatedRouteData.state;
        }
    }

    private async recordActivity() {
        const now = (new Date()).getTime();
        if (this.lastActivity != null && now - this.lastActivity < 250) {
            return;
        }

        this.lastActivity = now;
        this.storageService.save(ConstantsService.lastActiveKey, now);
    }

    private showToast(msg: any) {
        const toast: Toast = {
            type: msg.type,
            title: msg.title,
        };
        if (typeof (msg.text) === 'string') {
            toast.body = msg.text;
        } else if (msg.text.length === 1) {
            toast.body = msg.text[0];
        } else {
            let message = '';
            msg.text.forEach((t: string) =>
                message += ('<p>' + this.sanitizer.sanitize(SecurityContext.HTML, t) + '</p>'));
            toast.body = message;
            toast.bodyOutputType = BodyOutputType.TrustedHtml;
        }
        if (msg.options != null) {
            if (msg.options.trustedHtml === true) {
                toast.bodyOutputType = BodyOutputType.TrustedHtml;
            }
            if (msg.options.timeout != null && msg.options.timeout > 0) {
                toast.timeout = msg.options.timeout;
            }
        }
        this.toasterService.popAsync(toast);
    }

    private async showDialog(msg: any) {
        let iconClasses: string = null;
        const type = msg.type;
        if (type != null) {
            // If you add custom types to this part, the type to SweetAlertIcon cast below needs to be changed.
            switch (type) {
                case 'success':
                    iconClasses = 'fa-check text-success';
                    break;
                case 'warning':
                    iconClasses = 'fa-warning text-warning';
                    break;
                case 'error':
                    iconClasses = 'fa-bolt text-danger';
                    break;
                case 'info':
                    iconClasses = 'fa-info-circle text-info';
                    break;
                default:
                    break;
            }
        }

        const cancelText = msg.cancelText;
        const confirmText = msg.confirmText;
        const confirmed = await Swal.fire({
            heightAuto: false,
            buttonsStyling: false,
            icon: type as SweetAlertIcon, // required to be any of the SweetAlertIcons to output the iconHtml.
            iconHtml: iconClasses != null ? `<i class="swal-custom-icon fa ${iconClasses}"></i>` : undefined,
            text: msg.text,
            html: msg.html,
            titleText: msg.title,
            showCancelButton: (cancelText != null),
            cancelButtonText: cancelText,
            showConfirmButton: true,
            confirmButtonText: confirmText == null ? this.i18nService.t('ok') : confirmText,
            timer: 300000,
        });

        this.messagingService.send('showDialogResolve', {
            dialogId: msg.dialogId,
            confirmed: confirmed.value,
        });
    }

    private async showPasswordDialog(msg: any) {
        const platformUtils = this.platformUtilsService as BrowserPlatformUtilsService;

        const html = `
        ${msg.body}
        <div class="box password-reprompt">
            <div class="box-content">
                <div class="box-content-row box-content-row-flex">
                    <div class="row-main">
                        <label for="masterPassword">${this.i18nService.t('masterPass')}</label>
                        <input id="masterPassword" type="password" name="MasterPassword" class="monospaced" required>
                    </div>
                    <div class="action-buttons">
                        <a class="row-btn" href="#" id="toggleVisibility" role="button"
                            title="${this.i18nService.t('toggleVisibility')}">
                            <i class="fa fa-lg fa-eye" aria-hidden="true"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>
        `;

        let el: HTMLElement;
        let visible = false;

        const result = await Swal.fire({
            heightAuto: false,
            titleText: msg.title,
            html: html,
            confirmButtonText: this.i18nService.t('ok'),
            showCancelButton: true,
            cancelButtonText: this.i18nService.t('cancel'),
            inputAttributes: {
                autocapitalize: 'off',
                autocorrect: 'off',
            },
            preConfirm: async (): Promise<any> => {
                const input = el.querySelector('#masterPassword') as any;
                if (await platformUtils.resolvePasswordDialogPromise(msg.dialogId, false, input.value)) {
                    return true;
                }

                return Swal.showValidationMessage(this.i18nService.t('invalidMasterPassword'));
            },
            didOpen: el2 => {
                el = el2;

                const input = (el.querySelector('#masterPassword') as HTMLInputElement);
                input.focus();
                input.onkeydown = (event: KeyboardEvent) => {
                    if (event.key === 'Enter') {
                        Swal.clickConfirm();
                    }
                };

                const icon = el.querySelector('#toggleVisibility i');
                (el.querySelector('#toggleVisibility') as HTMLElement).onclick = (e) => {
                    e.preventDefault();
                    visible = !visible;
                    icon.classList.remove('fa-eye', 'fa-eye-slash');
                    icon.classList.add(visible ? 'fa-eye-slash' : 'fa-eye');
                    input.type = visible ? 'text' : 'password';
                };
            },
        });

        platformUtils.resolvePasswordDialogPromise(msg.dialogId, true, null);
    }
}
