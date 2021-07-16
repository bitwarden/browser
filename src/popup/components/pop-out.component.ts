import {
    Component,
    Input,
    OnInit,
} from '@angular/core';

import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';

import { PopupUtilsService } from '../services/popup-utils.service';

@Component({
    selector: 'app-pop-out',
    templateUrl: 'pop-out.component.html',
})
export class PopOutComponent implements OnInit {
    @Input() show = true;

    constructor(private platformUtilsService: PlatformUtilsService,
        private popupUtilsService: PopupUtilsService) { }

    ngOnInit() {
        if (this.show) {
            if (this.popupUtilsService.inPopout(window) || (this.popupUtilsService.inSidebar(window) && this.platformUtilsService.isFirefox())) {
                this.show = false;
            }
        }
    }

    expand() {
        this.popupUtilsService.popOut(window);
    }
}
