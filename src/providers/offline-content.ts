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

import { Injectable } from '@angular/core';
import { CoreAppProvider, CoreAppSchema } from './app';
import { CoreLoggerProvider } from './logger';
import { CoreEventsProvider } from '@providers/events';
import { CoreUtilsProvider } from './utils/utils';
import { SQLiteDB } from '@classes/sqlitedb';
import { makeSingleton } from '@singletons/core.singletons';
import { InAppBrowserObject } from '@ionic-native/in-app-browser';

/*
 * Generated class for the LocalNotificationsProvider provider.
 *
 * See https://angular.io/guide/dependency-injection for more info on providers
 * and Angular DI.
*/
@Injectable()
export class CoreOfflineAuthProvider {
    // Variables for the database.
    protected OFFLINE_AUTH_TABLE = 'offline_auth_table'; // Store to asigne unique codes to each site.
    protected tablesSchema: CoreAppSchema = {
        name: 'CoreOfflineAuthProvider',
        version: 2,
        tables: [
            {
                name: this.OFFLINE_AUTH_TABLE,
                columns: [
                    {
                        name: 'siteId',
                        type: 'TEXT',
                        notNull: true,
                        unique: true
                    },
                    {
                        name: 'userPasswordHash',
                        type: 'TEXT',
                    },
                    {
                        name: 'totpSecret',
                        type: 'TEXT'
                    }
                ]
            }
        ],
    };

    protected logger;
    protected appDB: SQLiteDB;
    protected dbReady: Promise<any>; // Promise resolved when the app DB is initialized.
    private siteId;
    private userPasswordHash
    
    constructor(
            logger: CoreLoggerProvider,
            private utils: CoreUtilsProvider,
            private eventsProvider: CoreEventsProvider,
            appProvider: CoreAppProvider) {

        this.logger = logger.getInstance('OfflineAuthProvider');
        this.appDB = appProvider.getDB();
        this.dbReady = appProvider.createTablesFromSchema(this.tablesSchema).catch(() => {
            // Ignore errors.
        });

        // On successful login update the DB with hashed credentials
        this.eventsProvider.on(CoreEventsProvider.LOGIN, () => {
            // Login is fired even on credential less login. In that case, cached credentials will 
            // be undefined and the DB won't update
            if(this.siteId && this.userPasswordHash) {
                this.updateHashedCredential(this.siteId, this.userPasswordHash);
                this.clearCachedCredentials();
            }
        });
    }

    clearCachedCredentials(): void {
        this.siteId = undefined;
        this.userPasswordHash = undefined;
    }

    listenForOfflineCredentials(iabInstance: InAppBrowserObject, url: string): void {
        iabInstance.on('message').subscribe(async (event: any) => {
            if (!event.data) {
                return;
            }

            const {subType, username, userPasswordHash, totpSecret} = event.data;

            // Cache credentials as the user fills out sso forms
            if(subType == 'sso-credentials') {
                if(username) {
                    this.siteId = this.utils.createSiteID(url, username);
                }
                if (userPasswordHash) {
                    this.userPasswordHash = userPasswordHash;
                }
            } else if(subType == 'totp-secret') {
                if(siteId && totpSecret) {
                    this.updateTotpSecret(siteId, totpSecret);
                }
            }
        });
    }

    async updateHashedCredential(siteId, userPasswordHash) {
        await this.dbReady;

        const entry = {
            siteId,
            userPasswordHash
        };

        this.appDB.insertOrUpdateRecord(this.OFFLINE_AUTH_TABLE, entry, {siteId});
    }

    async getHashedCredentials(siteId: string): Promise<string> {
        await this.dbReady;

        try {
            const entry = await this.appDB.getRecord(this.OFFLINE_AUTH_TABLE, {siteId: siteId});

            return entry.userPasswordHash;
        } catch (error) {
            return null;
        }

    }

    async updateTotpSecret(siteId, totpSecret) {
        await this.dbReady;

        const entry = {
            siteId,
            totpSecret
        };

        this.appDB.insertOrUpdateRecord(this.OFFLINE_AUTH_TABLE, entry, {siteId});
    }
}

export class CoreOfflineAuth extends makeSingleton(CoreOfflineAuthProvider) {}
