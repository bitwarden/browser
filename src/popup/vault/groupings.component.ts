import { Location } from '@angular/common';
import {
    ChangeDetectorRef,
    Component,
    NgZone,
    OnDestroy,
    OnInit,
} from '@angular/core';
import {
    ActivatedRoute,
    Router,
} from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { CipherType } from 'jslib-common/enums/cipherType';

import { CipherView } from 'jslib-common/models/view/cipherView';
import { CollectionView } from 'jslib-common/models/view/collectionView';
import { FolderView } from 'jslib-common/models/view/folderView';

import { CipherService } from 'jslib-common/abstractions/cipher.service';
import { CollectionService } from 'jslib-common/abstractions/collection.service';
import { FolderService } from 'jslib-common/abstractions/folder.service';
import { PlatformUtilsService } from 'jslib-common/abstractions/platformUtils.service';
import { SearchService } from 'jslib-common/abstractions/search.service';
import { StateService } from 'jslib-common/abstractions/state.service';
import { StorageService } from 'jslib-common/abstractions/storage.service';
import { SyncService } from 'jslib-common/abstractions/sync.service';
import { UserService } from 'jslib-common/abstractions/user.service';

import { BroadcasterService } from 'jslib-angular/services/broadcaster.service';

import { GroupingsComponent as BaseGroupingsComponent } from 'jslib-angular/components/groupings.component';

import { ArrowNavService } from '../services/arrow-nav.service';
import { PopupUtilsService } from '../services/popup-utils.service';

const ComponentId = 'GroupingsComponent';
const ScopeStateId = ComponentId + 'Scope';

@Component({
    selector: 'app-vault-groupings',
    templateUrl: 'groupings.component.html',
})
export class GroupingsComponent extends BaseGroupingsComponent implements OnInit, OnDestroy {

    get showNoFolderCiphers(): boolean {
        return this.noFolderCiphers != null && this.noFolderCiphers.length < this.noFolderListSize &&
            this.collections.length === 0;
    }

    get folderCount(): number {
        return this.nestedFolders.length - (this.showNoFolderCiphers ? 0 : 1);
    }
    ciphers: CipherView[];
    favoriteCiphers: CipherView[];
    noFolderCiphers: CipherView[];
    folderCounts = new Map<string, number>();
    collectionCounts = new Map<string, number>();
    typeCounts = new Map<CipherType, number>();
    searchText: string;
    state: any;
    scopeState: any;
    showLeftHeader = true;
    searchPending = false;
    searchTypeSearch = false;
    deletedCount = 0;
    arrowNav = new ArrowNavService();

    private loadedTimeout: number;
    private selectedTimeout: number;
    private preventSelected = false;
    private noFolderListSize = 100;
    private searchTimeout: any = null;
    private hasSearched = false;
    private hasLoadedAllCiphers = false;
    private allCiphers: CipherView[] = null;

    constructor(collectionService: CollectionService, folderService: FolderService,
        storageService: StorageService, userService: UserService,
        private cipherService: CipherService, private router: Router,
        private ngZone: NgZone, private broadcasterService: BroadcasterService,
        private changeDetectorRef: ChangeDetectorRef, private route: ActivatedRoute,
        private stateService: StateService, private popupUtils: PopupUtilsService,
        private syncService: SyncService, private platformUtilsService: PlatformUtilsService,
        private searchService: SearchService, private location: Location) {
        super(collectionService, folderService, storageService, userService);
        this.noFolderListSize = 100;
    }

    async ngOnInit() {
        this.searchTypeSearch = !this.platformUtilsService.isSafari();
        this.showLeftHeader = !(this.popupUtils.inSidebar(window) && this.platformUtilsService.isFirefox());
        this.stateService.remove('CiphersComponent');

        this.broadcasterService.subscribe(ComponentId, (message: any) => {
            this.ngZone.run(async () => {
                switch (message.command) {
                    case 'syncCompleted':
                        window.setTimeout(() => {
                            this.load();
                        }, 500);
                        break;
                    default:
                        break;
                }

                this.changeDetectorRef.detectChanges();
            });
        });

        const restoredScopeState = await this.restoreState();
        const queryParamsSub = this.route.queryParams.subscribe(async params => {
            this.state = (await this.stateService.get<any>(ComponentId)) || {};
            if (this.state.searchText) {
                this.searchText = this.state.searchText;
            } else if (params.searchText) {
                this.searchText = params.searchText;
                this.location.replaceState('vault');
            }

            if (!this.syncService.syncInProgress) {
                this.load();
            } else {
                this.loadedTimeout = window.setTimeout(() => {
                    if (!this.loaded) {
                        this.load();
                    }
                }, 5000);
            }

            if (!this.syncService.syncInProgress || restoredScopeState) {
                window.setTimeout(() => this.popupUtils.setContentScrollY(window, this.state.scrollY), 0);
            }
            if (queryParamsSub != null) {
                queryParamsSub.unsubscribe();
            }
        });
    }

    ngOnDestroy() {
        if (this.loadedTimeout != null) {
            window.clearTimeout(this.loadedTimeout);
        }
        if (this.selectedTimeout != null) {
            window.clearTimeout(this.selectedTimeout);
        }
        this.saveState();
        this.broadcasterService.unsubscribe(ComponentId);
    }

    async load() {
        await super.load(false);
        await this.loadCiphers();
        if (this.showNoFolderCiphers && this.nestedFolders.length > 0) {
            // Remove "No Folder" from folder listing
            this.nestedFolders = this.nestedFolders.slice(0, this.nestedFolders.length - 1);
        }

        this.initArrowNav();
    }

    async loadCiphers() {
        this.allCiphers = await this.cipherService.getAllDecrypted();
        if (!this.hasLoadedAllCiphers) {
            this.hasLoadedAllCiphers = !this.searchService.isSearchable(this.searchText);
        }
        this.deletedCount = this.allCiphers.filter(c => c.isDeleted).length;
        await this.search(null);
        let favoriteCiphers: CipherView[] = null;
        let noFolderCiphers: CipherView[] = null;
        const folderCounts = new Map<string, number>();
        const collectionCounts = new Map<string, number>();
        const typeCounts = new Map<CipherType, number>();

        this.ciphers.forEach(c => {
            if (c.isDeleted) {
                return;
            }
            if (c.favorite) {
                if (favoriteCiphers == null) {
                    favoriteCiphers = [];
                }
                favoriteCiphers.push(c);
            }

            if (c.folderId == null) {
                if (noFolderCiphers == null) {
                    noFolderCiphers = [];
                }
                noFolderCiphers.push(c);
            }

            if (typeCounts.has(c.type)) {
                typeCounts.set(c.type, typeCounts.get(c.type) + 1);
            } else {
                typeCounts.set(c.type, 1);
            }

            if (folderCounts.has(c.folderId)) {
                folderCounts.set(c.folderId, folderCounts.get(c.folderId) + 1);
            } else {
                folderCounts.set(c.folderId, 1);
            }

            if (c.collectionIds != null) {
                c.collectionIds.forEach(colId => {
                    if (collectionCounts.has(colId)) {
                        collectionCounts.set(colId, collectionCounts.get(colId) + 1);
                    } else {
                        collectionCounts.set(colId, 1);
                    }
                });
            }
        });

        this.favoriteCiphers = favoriteCiphers;
        this.noFolderCiphers = noFolderCiphers;
        this.typeCounts = typeCounts;
        this.folderCounts = folderCounts;
        this.collectionCounts = collectionCounts;
    }

    async search(timeout: number = null) {
        this.searchPending = false;
        if (this.searchTimeout != null) {
            clearTimeout(this.searchTimeout);
        }
        const filterDeleted = (c: CipherView) => !c.isDeleted;
        if (timeout == null) {
            this.hasSearched = this.searchService.isSearchable(this.searchText);
            this.ciphers = await this.searchService.searchCiphers(this.searchText, filterDeleted, this.allCiphers);
            this.initArrowNav();
            return;
        }
        this.searchPending = true;
        this.searchTimeout = setTimeout(async () => {
            this.hasSearched = this.searchService.isSearchable(this.searchText);
            if (!this.hasLoadedAllCiphers && !this.hasSearched) {
                await this.loadCiphers();
            } else {
                this.ciphers = await this.searchService.searchCiphers(this.searchText, filterDeleted, this.allCiphers);
            }
            this.searchPending = false;
            this.initArrowNav();
        }, timeout);
    }

    async selectType(type: CipherType) {
        super.selectType(type);
        this.router.navigate(['/ciphers'], { queryParams: { type: type } });
    }

    async selectFolder(folder: FolderView) {
        super.selectFolder(folder);
        this.router.navigate(['/ciphers'], { queryParams: { folderId: folder.id || 'none' } });
    }

    async selectCollection(collection: CollectionView) {
        super.selectCollection(collection);
        this.router.navigate(['/ciphers'], { queryParams: { collectionId: collection.id } });
    }

    async selectTrash() {
        super.selectTrash();
        this.router.navigate(['/ciphers'], { queryParams: { deleted: true } });
    }

    async selectCipher(cipher: CipherView) {
        this.selectedTimeout = window.setTimeout(() => {
            if (!this.preventSelected) {
                this.router.navigate(['/view-cipher'], { queryParams: { cipherId: cipher.id } });
            }
            this.preventSelected = false;
        }, 200);
    }

    async launchCipher(cipher: CipherView) {
        if (cipher.type !== CipherType.Login || !cipher.login.canLaunch) {
            return;
        }

        if (this.selectedTimeout != null) {
            window.clearTimeout(this.selectedTimeout);
        }
        this.preventSelected = true;
        await this.cipherService.updateLastLaunchedDate(cipher.id);
        BrowserApi.createNewTab(cipher.login.launchUri);
        if (this.popupUtils.inPopup(window)) {
            BrowserApi.closePopup(window);
        }
    }

    async addCipher() {
        this.router.navigate(['/add-cipher']);
    }

    showSearching() {
        return this.hasSearched || (!this.searchPending && this.searchService.isSearchable(this.searchText));
    }

    closeOnEsc(e: KeyboardEvent) {
        // If input not empty, use browser default behavior of clearing input instead
		if (e.key === 'Escape' && (this.searchText == null || this.searchText === '')) {
            BrowserApi.closePopup(window);
        }
    }

    private async saveState() {
        this.state = {
            scrollY: this.popupUtils.getContentScrollY(window),
            searchText: this.searchText,
        };
        await this.stateService.save(ComponentId, this.state);

        this.scopeState = {
            favoriteCiphers: this.favoriteCiphers,
            noFolderCiphers: this.noFolderCiphers,
            ciphers: this.ciphers,
            collectionCounts: this.collectionCounts,
            folderCounts: this.folderCounts,
            typeCounts: this.typeCounts,
            folders: this.folders,
            collections: this.collections,
            deletedCount: this.deletedCount,
        };
        await this.stateService.save(ScopeStateId, this.scopeState);
    }

    private async restoreState(): Promise<boolean> {
        this.scopeState = await this.stateService.get<any>(ScopeStateId);
        if (this.scopeState == null) {
            return false;
        }

        if (this.scopeState.favoriteCiphers != null) {
            this.favoriteCiphers = this.scopeState.favoriteCiphers;
        }
        if (this.scopeState.noFolderCiphers != null) {
            this.noFolderCiphers = this.scopeState.noFolderCiphers;
        }
        if (this.scopeState.ciphers != null) {
            this.ciphers = this.scopeState.ciphers;
        }
        if (this.scopeState.collectionCounts != null) {
            this.collectionCounts = this.scopeState.collectionCounts;
        }
        if (this.scopeState.folderCounts != null) {
            this.folderCounts = this.scopeState.folderCounts;
        }
        if (this.scopeState.typeCounts != null) {
            this.typeCounts = this.scopeState.typeCounts;
        }
        if (this.scopeState.folders != null) {
            this.folders = this.scopeState.folders;
        }
        if (this.scopeState.collections != null) {
            this.collections = this.scopeState.collections;
        }
        if (this.scopeState.deletedCiphers != null) {
            this.deletedCount = this.scopeState.deletedCount;
        }

        return true;
    }

    private initArrowNav() {
        if (this.showSearching()) {
            this.arrowNav.init([
                { name: 'searchCiphers', length: this.ciphers?.length ?? 0 },
                { name: 'search', length: 1 },
            ]);
        } else {
            this.arrowNav.init([
                { name: 'favorites', length: this.favoriteCiphers?.length ?? 0 },
                { name: 'types', length: 4 },
                { name: 'folders', length: this.nestedFolders?.length ?? 0 },
                { name: 'collections', length: this.nestedCollections?.length ?? 0 },
                { name: 'noFolder', length: this.noFolderCiphers?.length ?? 0 },
                { name: 'trash', length: 1 },
                { name: 'search', length: 1 },
            ]);
        }
    }
}
