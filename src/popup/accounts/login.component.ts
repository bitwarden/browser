import { Component } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from 'jslib/abstractions/auth.service';
import { CryptoFunctionService } from 'jslib/abstractions/cryptoFunction.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StateService } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { SyncService } from 'jslib/abstractions/sync.service';

import { LoginComponent as BaseLoginComponent } from 'jslib/angular/components/login.component';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';

@Component({
    selector: 'app-login',
    templateUrl: 'login.component.html',
})
export class LoginComponent extends BaseLoginComponent {
    constructor(authService: AuthService, router: Router,
        platformUtilsService: PlatformUtilsService, i18nService: I18nService,
        syncService: SyncService, storageService: StorageService,
        stateService: StateService, environmentService: EnvironmentService,
        passwordGenerationService: PasswordGenerationService,
        cryptoFunctionService: CryptoFunctionService) {
        super(authService, router, platformUtilsService, i18nService, stateService, environmentService,
            passwordGenerationService, cryptoFunctionService, storageService);
        super.onSuccessfulLogin = () => {
            return syncService.fullSync(true);
        };
        super.successRoute = '/tabs/vault';
    }

    settings() {
        this.router.navigate(['environment']);
    }
}
