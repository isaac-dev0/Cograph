'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">api documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                                <li class="link">
                                    <a href="index.html" data-type="chapter-link">
                                        <span class="icon ion-ios-keypad"></span>Overview
                                    </a>
                                </li>

                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>

                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AnalysisModule.html" data-type="entity-link" >AnalysisModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AnalysisModule-9b22d897444ed4f548c1e82bca98de2b9a072ebb3ea651deb1ce3d984bd16cf0d7b08d19e2a8c426b7c2996f1eea90a2c86934b23599234bef8fd0200747e82c"' : 'data-bs-target="#xs-injectables-links-module-AnalysisModule-9b22d897444ed4f548c1e82bca98de2b9a072ebb3ea651deb1ce3d984bd16cf0d7b08d19e2a8c426b7c2996f1eea90a2c86934b23599234bef8fd0200747e82c"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AnalysisModule-9b22d897444ed4f548c1e82bca98de2b9a072ebb3ea651deb1ce3d984bd16cf0d7b08d19e2a8c426b7c2996f1eea90a2c86934b23599234bef8fd0200747e82c"' :
                                        'id="xs-injectables-links-module-AnalysisModule-9b22d897444ed4f548c1e82bca98de2b9a072ebb3ea651deb1ce3d984bd16cf0d7b08d19e2a8c426b7c2996f1eea90a2c86934b23599234bef8fd0200747e82c"' }>
                                        <li class="link">
                                            <a href="injectables/AnalysisLoaders.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnalysisLoaders</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AnalysisResolver.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnalysisResolver</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/AnalysisService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnalysisService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/MCPAnalysisService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MCPAnalysisService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/MCPSummaryService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MCPSummaryService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                            </li>
                            <li class="link">
                                <a href="modules/AuthModule.html" data-type="entity-link" >AuthModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AuthModule-24bb0475cc0dd9939fd941025319c0178d86ede97193e4738115cec0117bc3452079cbbdb776647dc5c48134dcacefff2391d7cf8e89fb28d750adb8d0f4059e"' : 'data-bs-target="#xs-injectables-links-module-AuthModule-24bb0475cc0dd9939fd941025319c0178d86ede97193e4738115cec0117bc3452079cbbdb776647dc5c48134dcacefff2391d7cf8e89fb28d750adb8d0f4059e"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AuthModule-24bb0475cc0dd9939fd941025319c0178d86ede97193e4738115cec0117bc3452079cbbdb776647dc5c48134dcacefff2391d7cf8e89fb28d750adb8d0f4059e"' :
                                        'id="xs-injectables-links-module-AuthModule-24bb0475cc0dd9939fd941025319c0178d86ede97193e4738115cec0117bc3452079cbbdb776647dc5c48134dcacefff2391d7cf8e89fb28d750adb8d0f4059e"' }>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ProfileService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProfileService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SupabaseJwtStrategy.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SupabaseJwtStrategy</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/GraphModule.html" data-type="entity-link" >GraphModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-GraphModule-8f761a3ea334d9800f59a41ea6b6e27712b19cbc59588bb8f51d292ed7f8825c7fe21591beb274ef39335937efb77f92305c0620a4ff43c2f5852e1a208542ac"' : 'data-bs-target="#xs-injectables-links-module-GraphModule-8f761a3ea334d9800f59a41ea6b6e27712b19cbc59588bb8f51d292ed7f8825c7fe21591beb274ef39335937efb77f92305c0620a4ff43c2f5852e1a208542ac"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-GraphModule-8f761a3ea334d9800f59a41ea6b6e27712b19cbc59588bb8f51d292ed7f8825c7fe21591beb274ef39335937efb77f92305c0620a4ff43c2f5852e1a208542ac"' :
                                        'id="xs-injectables-links-module-GraphModule-8f761a3ea334d9800f59a41ea6b6e27712b19cbc59588bb8f51d292ed7f8825c7fe21591beb274ef39335937efb77f92305c0620a4ff43c2f5852e1a208542ac"' }>
                                        <li class="link">
                                            <a href="injectables/GraphQueryService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >GraphQueryService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/Neo4jGraphService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >Neo4jGraphService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/MCPModule.html" data-type="entity-link" >MCPModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-MCPModule-25bcfc60467732017b6b002b2e7b0c9b62fd38b801de1db3bcc8c9ff16a53ddfce52279150d606700d699f8b144253ff27441a25ad7999a9c5a82aec87370e4a"' : 'data-bs-target="#xs-injectables-links-module-MCPModule-25bcfc60467732017b6b002b2e7b0c9b62fd38b801de1db3bcc8c9ff16a53ddfce52279150d606700d699f8b144253ff27441a25ad7999a9c5a82aec87370e4a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-MCPModule-25bcfc60467732017b6b002b2e7b0c9b62fd38b801de1db3bcc8c9ff16a53ddfce52279150d606700d699f8b144253ff27441a25ad7999a9c5a82aec87370e4a"' :
                                        'id="xs-injectables-links-module-MCPModule-25bcfc60467732017b6b002b2e7b0c9b62fd38b801de1db3bcc8c9ff16a53ddfce52279150d606700d699f8b144253ff27441a25ad7999a9c5a82aec87370e4a"' }>
                                        <li class="link">
                                            <a href="injectables/MCPClientService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >MCPClientService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/PrismaModule.html" data-type="entity-link" >PrismaModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-PrismaModule-1e9d4070fdd0db88904122f1906ccf47d30cc8b2ff15ff0d095bce9cbd71db5be23da43987b5cd5324e1784d79a8eb089252f5d9476119575c957b5f3adf5f5b"' : 'data-bs-target="#xs-injectables-links-module-PrismaModule-1e9d4070fdd0db88904122f1906ccf47d30cc8b2ff15ff0d095bce9cbd71db5be23da43987b5cd5324e1784d79a8eb089252f5d9476119575c957b5f3adf5f5b"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-PrismaModule-1e9d4070fdd0db88904122f1906ccf47d30cc8b2ff15ff0d095bce9cbd71db5be23da43987b5cd5324e1784d79a8eb089252f5d9476119575c957b5f3adf5f5b"' :
                                        'id="xs-injectables-links-module-PrismaModule-1e9d4070fdd0db88904122f1906ccf47d30cc8b2ff15ff0d095bce9cbd71db5be23da43987b5cd5324e1784d79a8eb089252f5d9476119575c957b5f3adf5f5b"' }>
                                        <li class="link">
                                            <a href="injectables/PrismaService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >PrismaService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ProfilesModule.html" data-type="entity-link" >ProfilesModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ProfilesModule-b6dff72551f6ee566860f548b880b776b271d8a656c205cda6167aa00a1cc4f644c7d3aa3806d622290fae22ebc3413d2d367d9089b4c23abb208936e6fb6451"' : 'data-bs-target="#xs-injectables-links-module-ProfilesModule-b6dff72551f6ee566860f548b880b776b271d8a656c205cda6167aa00a1cc4f644c7d3aa3806d622290fae22ebc3413d2d367d9089b4c23abb208936e6fb6451"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ProfilesModule-b6dff72551f6ee566860f548b880b776b271d8a656c205cda6167aa00a1cc4f644c7d3aa3806d622290fae22ebc3413d2d367d9089b4c23abb208936e6fb6451"' :
                                        'id="xs-injectables-links-module-ProfilesModule-b6dff72551f6ee566860f548b880b776b271d8a656c205cda6167aa00a1cc4f644c7d3aa3806d622290fae22ebc3413d2d367d9089b4c23abb208936e6fb6451"' }>
                                        <li class="link">
                                            <a href="injectables/ProfileService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProfileService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/ProjectsModule.html" data-type="entity-link" >ProjectsModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-ProjectsModule-7515303f8d8a252b2d6beac0da59967d3b962305da66c2285291f3f10d2b827800de3a65687b8d1350d77a0cb35107dcdf71ac39e1356e6216f11e61a4c094e1"' : 'data-bs-target="#xs-injectables-links-module-ProjectsModule-7515303f8d8a252b2d6beac0da59967d3b962305da66c2285291f3f10d2b827800de3a65687b8d1350d77a0cb35107dcdf71ac39e1356e6216f11e61a4c094e1"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-ProjectsModule-7515303f8d8a252b2d6beac0da59967d3b962305da66c2285291f3f10d2b827800de3a65687b8d1350d77a0cb35107dcdf71ac39e1356e6216f11e61a4c094e1"' :
                                        'id="xs-injectables-links-module-ProjectsModule-7515303f8d8a252b2d6beac0da59967d3b962305da66c2285291f3f10d2b827800de3a65687b8d1350d77a0cb35107dcdf71ac39e1356e6216f11e61a4c094e1"' }>
                                        <li class="link">
                                            <a href="injectables/ProjectsLoaders.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProjectsLoaders</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ProjectsResolver.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProjectsResolver</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/ProjectsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >ProjectsService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/RepositoriesModule.html" data-type="entity-link" >RepositoriesModule</a>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-RepositoriesModule-f7a3aa5580b781368cabe4f64a6ace9076f63c98fae486724335d6c595bec19b9b182699fa685d5c5724c709e77d48883034255671504683c38e54c8aca9848f"' : 'data-bs-target="#xs-injectables-links-module-RepositoriesModule-f7a3aa5580b781368cabe4f64a6ace9076f63c98fae486724335d6c595bec19b9b182699fa685d5c5724c709e77d48883034255671504683c38e54c8aca9848f"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-RepositoriesModule-f7a3aa5580b781368cabe4f64a6ace9076f63c98fae486724335d6c595bec19b9b182699fa685d5c5724c709e77d48883034255671504683c38e54c8aca9848f"' :
                                        'id="xs-injectables-links-module-RepositoriesModule-f7a3aa5580b781368cabe4f64a6ace9076f63c98fae486724335d6c595bec19b9b182699fa685d5c5724c709e77d48883034255671504683c38e54c8aca9848f"' }>
                                        <li class="link">
                                            <a href="injectables/AnnotationsService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AnnotationsService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/RepositoriesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RepositoriesService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/RepositoryFileService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >RepositoryFileService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/SyncRepositoriesService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >SyncRepositoriesService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/AnalysisJob.html" data-type="entity-link" >AnalysisJob</a>
                            </li>
                            <li class="link">
                                <a href="classes/AnnotationAuthor.html" data-type="entity-link" >AnnotationAuthor</a>
                            </li>
                            <li class="link">
                                <a href="classes/CannotRemoveOwnerException.html" data-type="entity-link" >CannotRemoveOwnerException</a>
                            </li>
                            <li class="link">
                                <a href="classes/CircularDependency.html" data-type="entity-link" >CircularDependency</a>
                            </li>
                            <li class="link">
                                <a href="classes/CodeEntity.html" data-type="entity-link" >CodeEntity</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateAnnotationInput.html" data-type="entity-link" >CreateAnnotationInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/CreateProjectInput.html" data-type="entity-link" >CreateProjectInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/DatabaseHelper.html" data-type="entity-link" >DatabaseHelper</a>
                            </li>
                            <li class="link">
                                <a href="classes/DependencyGraph.html" data-type="entity-link" >DependencyGraph</a>
                            </li>
                            <li class="link">
                                <a href="classes/DocumentAnnotation.html" data-type="entity-link" >DocumentAnnotation</a>
                            </li>
                            <li class="link">
                                <a href="classes/DuplicateProjectNameException.html" data-type="entity-link" >DuplicateProjectNameException</a>
                            </li>
                            <li class="link">
                                <a href="classes/FileAnnotation.html" data-type="entity-link" >FileAnnotation</a>
                            </li>
                            <li class="link">
                                <a href="classes/FindRepositoriesInput.html" data-type="entity-link" >FindRepositoriesInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/GraphEdge.html" data-type="entity-link" >GraphEdge</a>
                            </li>
                            <li class="link">
                                <a href="classes/GraphNode.html" data-type="entity-link" >GraphNode</a>
                            </li>
                            <li class="link">
                                <a href="classes/GraphOptionsInput.html" data-type="entity-link" >GraphOptionsInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/GraphQLClient.html" data-type="entity-link" >GraphQLClient</a>
                            </li>
                            <li class="link">
                                <a href="classes/GraphResolver.html" data-type="entity-link" >GraphResolver</a>
                            </li>
                            <li class="link">
                                <a href="classes/ImportRepositoryInput.html" data-type="entity-link" >ImportRepositoryInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/InvalidOwnershipTransferException.html" data-type="entity-link" >InvalidOwnershipTransferException</a>
                            </li>
                            <li class="link">
                                <a href="classes/MemberNotFoundException.html" data-type="entity-link" >MemberNotFoundException</a>
                            </li>
                            <li class="link">
                                <a href="classes/Profile.html" data-type="entity-link" >Profile</a>
                            </li>
                            <li class="link">
                                <a href="classes/ProfilesResolver.html" data-type="entity-link" >ProfilesResolver</a>
                            </li>
                            <li class="link">
                                <a href="classes/Project.html" data-type="entity-link" >Project</a>
                            </li>
                            <li class="link">
                                <a href="classes/ProjectMember.html" data-type="entity-link" >ProjectMember</a>
                            </li>
                            <li class="link">
                                <a href="classes/ProjectNotFoundException.html" data-type="entity-link" >ProjectNotFoundException</a>
                            </li>
                            <li class="link">
                                <a href="classes/RepositoriesResolver.html" data-type="entity-link" >RepositoriesResolver</a>
                            </li>
                            <li class="link">
                                <a href="classes/Repository.html" data-type="entity-link" >Repository</a>
                            </li>
                            <li class="link">
                                <a href="classes/RepositoryFile.html" data-type="entity-link" >RepositoryFile</a>
                            </li>
                            <li class="link">
                                <a href="classes/RepositorySyncHistory.html" data-type="entity-link" >RepositorySyncHistory</a>
                            </li>
                            <li class="link">
                                <a href="classes/SyncProfileInput.html" data-type="entity-link" >SyncProfileInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/SyncRepositoriesInput.html" data-type="entity-link" >SyncRepositoriesInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/UnauthorisedProjectAccessException.html" data-type="entity-link" >UnauthorisedProjectAccessException</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateAnnotationInput.html" data-type="entity-link" >UpdateAnnotationInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateProfileInput.html" data-type="entity-link" >UpdateProfileInput</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateProjectInput.html" data-type="entity-link" >UpdateProjectInput</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#injectables-links"' :
                                'data-bs-target="#xs-injectables-links"' }>
                                <span class="icon ion-md-arrow-round-down"></span>
                                <span>Injectables</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="injectables-links"' : 'id="xs-injectables-links"' }>
                                <li class="link">
                                    <a href="injectables/AnalysisLoaders.html" data-type="entity-link" >AnalysisLoaders</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnalysisResolver.html" data-type="entity-link" >AnalysisResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnalysisService.html" data-type="entity-link" >AnalysisService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/AnnotationsService.html" data-type="entity-link" >AnnotationsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/GraphQueryService.html" data-type="entity-link" >GraphQueryService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MCPAnalysisService.html" data-type="entity-link" >MCPAnalysisService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MCPClientService.html" data-type="entity-link" >MCPClientService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/MCPSummaryService.html" data-type="entity-link" >MCPSummaryService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/Neo4jGraphService.html" data-type="entity-link" >Neo4jGraphService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/PrismaService.html" data-type="entity-link" >PrismaService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProfileService.html" data-type="entity-link" >ProfileService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProjectsLoaders.html" data-type="entity-link" >ProjectsLoaders</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProjectsResolver.html" data-type="entity-link" >ProjectsResolver</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/ProjectsService.html" data-type="entity-link" >ProjectsService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RepositoriesService.html" data-type="entity-link" >RepositoriesService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/RepositoryFileService.html" data-type="entity-link" >RepositoryFileService</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SupabaseJwtGuard.html" data-type="entity-link" >SupabaseJwtGuard</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SupabaseJwtStrategy.html" data-type="entity-link" >SupabaseJwtStrategy</a>
                                </li>
                                <li class="link">
                                    <a href="injectables/SyncRepositoriesService.html" data-type="entity-link" >SyncRepositoriesService</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/AnalysisJobData.html" data-type="entity-link" >AnalysisJobData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/AnalysisJobResult.html" data-type="entity-link" >AnalysisJobResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CircularDependency.html" data-type="entity-link" >CircularDependency</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CodeEntity.html" data-type="entity-link" >CodeEntity</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/CodeEntityData.html" data-type="entity-link" >CodeEntityData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/DependencyGraph.html" data-type="entity-link" >DependencyGraph</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/EntityNodeData.html" data-type="entity-link" >EntityNodeData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ExportStatement.html" data-type="entity-link" >ExportStatement</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileAnalysis.html" data-type="entity-link" >FileAnalysis</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileAnalysisResult.html" data-type="entity-link" >FileAnalysisResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/FileNodeData.html" data-type="entity-link" >FileNodeData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GraphEdge.html" data-type="entity-link" >GraphEdge</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GraphEdgeData.html" data-type="entity-link" >GraphEdgeData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GraphNode.html" data-type="entity-link" >GraphNode</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GraphNodeData.html" data-type="entity-link" >GraphNodeData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/GraphQLResponse.html" data-type="entity-link" >GraphQLResponse</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportRelationshipData.html" data-type="entity-link" >ImportRelationshipData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/ImportStatement.html" data-type="entity-link" >ImportStatement</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/MCPClient.html" data-type="entity-link" >MCPClient</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Neo4jNode.html" data-type="entity-link" >Neo4jNode</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/Neo4jRelationship.html" data-type="entity-link" >Neo4jRelationship</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PaginationOptions.html" data-type="entity-link" >PaginationOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PollOptions.html" data-type="entity-link" >PollOptions</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/PollWithStatusResult.html" data-type="entity-link" >PollWithStatusResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RawGraphComponents.html" data-type="entity-link" >RawGraphComponents</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RepositoryAnalysis.html" data-type="entity-link" >RepositoryAnalysis</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/RepositoryFileData.html" data-type="entity-link" >RepositoryFileData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SupabaseAuthData.html" data-type="entity-link" >SupabaseAuthData</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SupabaseJwtPayload.html" data-type="entity-link" >SupabaseJwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/SupabaseJwtPayload-1.html" data-type="entity-link" >SupabaseJwtPayload</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TestRepository.html" data-type="entity-link" >TestRepository</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TestRepositoryData.html" data-type="entity-link" >TestRepositoryData</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/typealiases.html" data-type="entity-link">Type aliases</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                        <li class="chapter">
                            <a data-type="chapter-link" href="routes.html"><span class="icon ion-ios-git-branch"></span>Routes</a>
                        </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});