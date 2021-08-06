// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Component, ViewChild, ElementRef } from '@angular/core';
import { IonicPage, NavController, NavParams } from 'ionic-angular';
import { CoreAppProvider } from '@providers/app';
import { CoreOfflineAuthProvider } from '@providers/offline-content';
import { CoreEventsProvider } from '@providers/events';
import { CoreSitesProvider } from '@providers/sites';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { CoreLoginHelperProvider } from '../../providers/helper';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import sjcl from 'sjcl';

/**
 * Page to enter the user password to totp to a site.
 */
@IonicPage({ segment: 'core-login-totp' })
@Component({
    selector: 'page-core-login-totp',
    templateUrl: 'totp.html',
})
export class CoreLoginTotpPage {

    @ViewChild('totpForm') formElement: ElementRef;

    credForm: FormGroup;
    siteUrl: string;
    username: string;
    siteName: string;
    logoUrl: string;
    identityProviders: any[];
    site: any;
    showForgottenPassword = true;
    showSiteAvatar = false;

    protected infoSiteUrl: string;
    protected pageName: string;
    protected pageParams: any;
    protected siteConfig: any;
    protected isLoggedOut: boolean;
    protected siteId: string;
    protected viewLeft = false;
    protected eventThrown = false;

    constructor(protected navCtrl: NavController,
            navParams: NavParams,
            fb: FormBuilder,
            protected appProvider: CoreAppProvider,
            protected sitesProvider: CoreSitesProvider,
            protected loginHelper: CoreLoginHelperProvider,
            protected domUtils: CoreDomUtilsProvider,
            protected eventsProvider: CoreEventsProvider) {

        const currentSite = this.sitesProvider.getCurrentSite();

        this.infoSiteUrl = navParams.get('infoSiteUrl');
        this.pageName = navParams.get('pageName');
        this.pageParams = navParams.get('pageParams');
        this.siteConfig = navParams.get('siteConfig');
        this.siteUrl = navParams.get('siteUrl');
        this.siteId = navParams.get('siteId');

        this.isLoggedOut = currentSite && currentSite.isLoggedOut();
        this.credForm = fb.group({
            password: ['', Validators.required]
        });
    }

    /**
     * View loaded.
     */
    ionViewDidLoad(): void {
        if (this.siteConfig) {
            this.getDataFromConfig(this.siteConfig);
        }

        this.sitesProvider.getSite(this.siteId).then((site) => {
            this.site = {
                id: site.id,
                fullname: site.infos.fullname,
                avatar: site.infos.userpictureurl
            };

            this.siteUrl = site.infos.siteurl;
            this.siteName = site.getSiteName();

            // Show logo instead of avatar if it's a fixed site.
            this.showSiteAvatar = this.site.avatar && !this.loginHelper.getFixedSites();

            return site.getPublicConfig().then((config) => {
                return this.sitesProvider.checkApplication(config).then(() => {
                    // Check logoURL if user avatar is not set.
                    if (this.site.avatar.startsWith(site.infos.siteurl + '/theme/image.php')) {
                        this.showSiteAvatar = false;
                    }
                    this.logoUrl = this.loginHelper.getLogoUrl(config);

                    this.getDataFromConfig(this.siteConfig);
                }).catch(() => {
                    this.cancel();
                });
            }).catch(() => {
                // Ignore errors.
            });
        }).catch(() => {
            // Shouldn't happen. Just leave the view.
            this.cancel();
        });
    }

    /**
     * View destroyed.
     */
    ionViewWillUnload(): void {
        this.viewLeft = true;
        this.eventsProvider.trigger(CoreEventsProvider.LOGIN_SITE_UNCHECKED, { config: this.siteConfig }, this.siteId);
    }

    /**
     * Get some data (like identity providers) from the site config.
     *
     * @param config Config to use.
     */
    protected getDataFromConfig(config: any): void {
        const disabledFeatures = this.loginHelper.getDisabledFeatures(config);

        this.identityProviders = this.loginHelper.getValidIdentityProviders(config, disabledFeatures);
        this.showForgottenPassword = !this.loginHelper.isForgottenPasswordDisabled(config);

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            this.eventsProvider.trigger(CoreEventsProvider.LOGIN_SITE_CHECKED, { config: config });
        }
    }

    /**
     * Cancel totp.
     *
     * @param e Event.
     */
    cancel(e?: Event): void {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        this.navCtrl.pop();
        this.sitesProvider.logout();
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     */
    login(e: Event): void {
        e.preventDefault();
        e.stopPropagation();

        this.appProvider.closeKeyboard();

        // Get input data.
        const otpCode = this.credForm.value.password;

        if (!otpCode) {
            this.domUtils.showErrorModal('core.login.passwordrequired', true);
            return;
        }

        if (!this.appProvider.isOnline()) {
            this.validateTOTP(otpCode).then((success) => {
                if (success) {
                    this.sitesProvider.offlineLogin(this.siteId).then(() => {
                        this.domUtils.triggerFormSubmittedEvent(this.formElement, true);
                        // Reset fields so the data is not in the view anymore.
                        this.credForm.controls['password'].reset();

                        // Go to the site initial page.
                        this.loginHelper.goToSiteInitialPage(this.navCtrl, this.pageName, this.pageParams);
                    });
                } else {
                    this.domUtils.showErrorModal('addon.mod_lesson.loginfail', true);
                }
            });
        } else {
            this.navCtrl.pop();
        }
    }

    async validateTOTP(otpCode: string): Promise<boolean> {
        try {
            return true;
        } catch (error) {
            return false;
        }
    }
}
