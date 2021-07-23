import {
    Directive,
    EventEmitter,
    HostListener,
    Output,
} from '@angular/core';

@Directive({
    selector: '[appCopyPaste]',
})
export class CopyPasteDirective {
    @Output() cut = new EventEmitter();
    @Output() copy = new EventEmitter();
    @Output() paste = new EventEmitter();

    @HostListener('keydown', ['$event']) onKeyDown($event: KeyboardEvent) {
        this.getEventEmitter($event)?.emit();
    }

    private getEventEmitter($event: KeyboardEvent) {
        if (!$event.ctrlKey || $event.shiftKey || $event.altKey || $event.metaKey || $event.repeat)
            return null;

        switch ($event.code) {
            case 'KeyX':
                return this.cut;
            case 'KeyC':
                return this.copy;
            case 'KeyV':
                return this.paste;
            default:
                return null;
        }
    }
}
