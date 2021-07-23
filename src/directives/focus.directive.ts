import {
    Directive,
    ElementRef,
    Input,
} from '@angular/core';

@Directive({
    selector: '[appFocus]',
})
export class FocusDirective {
    @Input() focus: boolean;

    constructor(private el: ElementRef) { }

    ngOnChanges() {
        if (!this.focus)
            return;

        this.getFocusableElement(this.el.nativeElement)?.focus();
    }

    private getFocusableElement(el: Element): HTMLElement {
        if (this.isFocusableElement(el))
            return el as HTMLElement;

        for (let i = 0; i < el.children.length; i++) {
            const focusable = this.getFocusableElement(el.children[i]);
            if (focusable) {
                return focusable;
            }
        }

        return null;
    }

    private isFocusableElement(el: Element): boolean {
        return el instanceof HTMLInputElement ||
            el instanceof HTMLSelectElement ||
            el instanceof HTMLTextAreaElement ||
            el instanceof HTMLAnchorElement ||
            el instanceof HTMLButtonElement;
    }
}
