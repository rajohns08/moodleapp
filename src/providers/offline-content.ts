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
        version: 1,
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
                    }
                ]
            }
        ],
    };

    protected logger;
    protected appDB: SQLiteDB;
    protected dbReady: Promise<any>; // Promise resolved when the app DB is initialized.
    
    constructor(
            logger: CoreLoggerProvider,
            private utils: CoreUtilsProvider,
            appProvider: CoreAppProvider) {

        this.logger = logger.getInstance('OfflineAuthProvider');
        this.appDB = appProvider.getDB();
        this.dbReady = appProvider.createTablesFromSchema(this.tablesSchema).catch(() => {
            // Ignore errors.
        });
    }

    listenForHashedCredentias(iabInstance: InAppBrowserObject, url: string): void {
        iabInstance.on('message').subscribe(async (event: any) => {
            if (!event.data) {
                return;
            }
            
            const {subType, username, userPasswordHash} = event.data;

            if (subType == 'sso-credentials') {
                await this.dbReady;
                const entry = {
                    siteId: this.utils.createSiteID(url, username),
                    userPasswordHash
                };
                this.appDB.insertRecord(this.OFFLINE_AUTH_TABLE, entry);
            }
        });
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
}

export class CoreOfflineAuth extends makeSingleton(CoreOfflineAuthProvider) {}
