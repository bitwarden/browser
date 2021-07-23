import { Injectable } from '@angular/core';

@Injectable()
export class ArrowNavService {
    navType: string = null;
    navIndex: number = -1;

    private allNavTypes: NavType[] = [];
    private navTypeIndex: number = -1;

    init(navTypes: NavType[]) {
        this.allNavTypes = navTypes;
    }

    down() {
        this.navIndex++;

        if (!this.navType)
            this.navType = this.getNextNavType();

        while (this.navIndex >= this.getNavLength()) {
            const navType = this.navType;
            this.navType = this.getNextNavType();
            this.navIndex = 0;
            if (this.navType === navType)
                return;
        }
    }

    up() {
        this.navIndex--;

        if (!this.navType)
            this.navType = this.getPrevNavType();

        while (this.navIndex < 0) {
            const navType = this.navType;
            this.navType = this.getPrevNavType();
            this.navIndex = this.getNavLength() - 1;
            if (this.navType === navType)
                return;
        }
    }

    reset() {
        this.navType = null;
        this.navIndex = -1;
        this.navTypeIndex = -1;
    }

    private getNextNavType() {
        this.navTypeIndex++;
        if (this.navTypeIndex >= this.allNavTypes.length)
            this.navTypeIndex = 0;

        return this.allNavTypes[this.navTypeIndex].name;
    }

    private getPrevNavType() {
        this.navTypeIndex--;
        if (this.navTypeIndex < 0)
            this.navTypeIndex = this.allNavTypes.length - 1;

        return this.allNavTypes[this.navTypeIndex].name;
    }

    private getNavLength() {
        return this.allNavTypes[this.navTypeIndex].length;
    }
}

interface NavType {
    name: string;
    length: number;
}
