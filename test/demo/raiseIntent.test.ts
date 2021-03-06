import 'jest';

import {fin} from './utils/fin';
import * as fdc3Remote from './utils/fdc3RemoteExecution';

const testManagerIdentity = {
    uuid: 'test-app',
    name: 'test-app'
};

const validPayload = {
    intent: 'DialCall',
    context: {
        type: 'contact',
        name: 'Test Name',
        id: {
            twitter: '@testname'
        }
    }
};
const invalidPayload = {
    intent: 'some-nonexistent-intent',
    context: {
        type: 'some-other-context',
        value: 10,
        id: {
            prop: 'id'
        }
    }
};

describe('Intent listeners and raising intents', () => {
    beforeEach(async () => {
        // The main launcher app should remain running for the duration of all tests.
        await expect(fin.Application.wrapSync(testManagerIdentity).isRunning()).resolves.toBe(true);
    });

    describe('With a target', () => {
        const testAppIdentity = {
            uuid: 'test-app-1',
            name: 'test-app-1',
            appId: '100'
        };
        describe('When the target is running', () => {
            beforeEach(async () => {
                await fdc3Remote.open(testManagerIdentity, testAppIdentity.uuid);
            });

            afterEach(async () => {
                await fin.Application.wrapSync(testAppIdentity).quit().catch(() => {});
            });

            test('When calling addIntentListener for the first time, the promise resolves and there are no errors', async () => {
                await expect(fdc3Remote.addIntentListener(testAppIdentity, validPayload.intent)).resolves.not.toThrow();
            });

            describe('When the target is registered to accept the raised intent', () => {
                let listener: fdc3Remote.RemoteIntentListener;

                beforeEach(async () => {
                    listener = await fdc3Remote.addIntentListener(testAppIdentity, validPayload.intent);
                });

                test('When calling raiseIntent from another app the listener is triggered exactly once with the correct context', async () => {
                    await fdc3Remote.raiseIntent(testManagerIdentity, validPayload.intent, validPayload.context, testAppIdentity.appId);

                    const receivedContexts = await listener.getReceivedContexts();
                    expect(receivedContexts).toEqual([validPayload.context]);
                });
            });

            describe('When the target is *not* registered to accept the raised intent', () => {
                test('When calling raiseIntent the promise rejects with an error', async () => {
                    const resultPromise = fdc3Remote.raiseIntent(testManagerIdentity, invalidPayload.intent, invalidPayload.context, testAppIdentity.appId);
                    // TODO: decide if this is this the error message we want when sending a targeted intent
                    await expect(resultPromise).rejects.toThrowError(/No applications available to handle this intent/);
                });
            });
            describe('When the target is not in the directory', () => {
                // Currently this will just open the resolver UI, which is probably the wrong behaviour
                // TODO: Make the service return an error when targeting an app which isn't in the directory
                test.skip('When calling raseIntent the promise rejects with an error', async () => {
                    const resultPromise = fdc3Remote.raiseIntent(testManagerIdentity, validPayload.intent, validPayload.context, 'this-app-does-not-exist');
                    // TODO: decide what the error should be
                    await expect(resultPromise).rejects.toThrow();
                });
            });
        });

        describe('When the target is not running', () => {
            const testAppIdentity = {
                uuid: 'test-app-preregistered-1',
                name: 'test-app-preregistered-1',
                appId: '500'
            };

            describe('When the target is registered to accept the raised intent', () => {
                test('The targeted app opens and its listener is triggered exactly once with the correct context', async () => {
                    await fdc3Remote.raiseIntent(testManagerIdentity, validPayload.intent, validPayload.context, testAppIdentity.appId);

                    // App should now be running
                    await expect(fin.Application.wrapSync(testAppIdentity).isRunning()).resolves.toBe(true);

                    const listener = await fdc3Remote.getRemoteIntentListener(testAppIdentity, validPayload.intent);
                    const receivedContexts = await listener.getReceivedContexts();

                    expect(receivedContexts).toEqual([validPayload.context]);

                    await fin.Application.wrapSync(testAppIdentity).quit();
                });
            });

            describe('When the target is *not* registered to accept the raised intent', () => {
                // TBD: should the app open if the intent is not valid?
                test.todo('When calling raiseIntent [behavoir TBD]');
            });
            describe('When the target is not in the directory', () => {
                // Currently this will just open the resolver UI, which is probably the wrong behaviour
                // TODO: Make the service return an error when targeting an app which isn't in the directory
                test.skip('When calling raiseIntent the promise rejects with an error', async () => {
                    const resultPromise = fdc3Remote.raiseIntent(testManagerIdentity, validPayload.intent, validPayload.context, 'this-app-does-not-exist');
                    // TODO: decide what the error should be
                    await expect(resultPromise).rejects.toThrow();
                });
            });
        });
    });

    describe('Without a target', () => {
        describe('With no apps registered to accept the raised intent', () => {
            test('When calling raiseIntent the promise rejects with an error', async () => {
                await expect(fdc3Remote.raiseIntent(testManagerIdentity, invalidPayload.intent, invalidPayload.context)).rejects.toThrow();
            });
        });

        // TODO: find a way to dynamically set the app directory for these tests
        describe('With one app registered to accept the raised intent', () => {
            describe('With the registered app running', () => {
                test.todo('When calling raiseIntent from another app the listener is triggered exactly once with the correct context');
            });

            describe('With the registered app not running', () => {
                test.todo('The targeted app opens and its listener is triggered exactly once with the correct context');
            });
        });

        describe('With multiple apps registered to accept the raised intent', () => {
            // TODO: figure out how to test the resolver UI properly
        });
    });
});
