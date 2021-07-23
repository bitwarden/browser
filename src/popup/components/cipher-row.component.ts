import {
    Component,
    EventEmitter,
    Input,
    Output,
    ViewChild,
} from '@angular/core';

import { CipherView } from 'jslib-common/models/view/cipherView';

import { ActionButtonsComponent } from './action-buttons.component';

@Component({
    selector: 'app-cipher-row',
    templateUrl: 'cipher-row.component.html',
})
export class CipherRowComponent {
    @Output() onSelected = new EventEmitter<CipherView>();
    @Output() launchEvent = new EventEmitter<CipherView>();
    @Output() onView = new EventEmitter<CipherView>();
    @Input() cipher: CipherView;
    @Input() showView = false;
    @Input() title: string;

    @ViewChild(ActionButtonsComponent) actionButtons: ActionButtonsComponent;

    selectCipher(c: CipherView) {
        this.onSelected.emit(c);
    }

    launchCipher(c: CipherView) {
        this.launchEvent.emit(c);
    }

    viewCipher(c: CipherView) {
        this.onView.emit(c);
    }

    copyPassword(cipher: CipherView) {
        this.actionButtons.copy(cipher, cipher.login.password, 'password', 'Password');
    }
}
